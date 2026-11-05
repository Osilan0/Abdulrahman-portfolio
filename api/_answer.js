// The chat logic, shared by every host:
//   - Vercel and the local preview, through api/chat.js
//   - Cloudflare Workers, through worker.js
//   - Cloudflare Pages, through functions/api/chat.js
// It answers only from profile.json, using any OpenAI-compatible provider (Groq by default). Settings come from
// the host's environment variables, so your API key stays on the server and never reaches the browser.
// (Files in api/ that start with "_" are helpers, not separate endpoints.)
const core = require('../core.js');

const MAX_TURNS = 10;
const MAX_CHARS = 1000;
const hits = new Map(); // best-effort rate limit, per warm server instance
const profiles = new WeakMap(); // raw profile.json -> normalized profile, built once per instance

function providers(env) {
  const primary = { base: env.LLM_BASE_URL || 'https://api.groq.com/openai/v1', key: env.LLM_API_KEY, model: env.LLM_MODEL || 'openai/gpt-oss-120b' };
  // Backup model, tried when the main one fails or hits its free limit. With no FALLBACK_BASE_URL it uses the
  // same provider and key, and on Groq each model has its own free limits, so a second model doubles capacity.
  // A key is never sent to a different provider: a FALLBACK_BASE_URL needs its own FALLBACK_API_KEY.
  // FALLBACK_MODEL=none turns it off.
  const fbModel = env.FALLBACK_MODEL === 'none' ? '' : env.FALLBACK_MODEL || (/groq\.com/i.test(primary.base) ? 'openai/gpt-oss-20b' : '');
  const fallback = env.FALLBACK_BASE_URL
    ? { base: env.FALLBACK_BASE_URL, key: env.FALLBACK_API_KEY, model: fbModel }
    : { base: primary.base, key: primary.key, model: fbModel };
  return [primary, fallback].filter((x, i, all) => x.base && x.key && x.model && !(i && x.model === all[0].model && x.base === all[0].base));
}

async function askModel(p, system, turns, env) {
  const r = await fetch(p.base.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.2, // low = sticks to the facts
      max_tokens: 800,
      // gpt-oss models think before answering; "low" keeps that short, fast and cheap on free limits
      ...(/gpt-oss/i.test(p.model) ? { reasoning_effort: env.LLM_REASONING_EFFORT || 'low' } : {}),
      messages: [{ role: 'system', content: system }, ...turns]
    }),
    signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) throw new Error(`${p.model} answered HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const raw = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  const text = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); // some models print their reasoning
  if (!text) throw new Error(`${p.model} returned an empty answer`);
  return text;
}

// One request in, one { status, json, headers } out. GET reports whether the AI is configured; POST answers.
async function answer({ method, origin, ip, body, env, profile }) {
  env = env || {};
  const list = providers(env);
  if (method === 'GET') return { status: 200, json: { ok: true, ai: list.length > 0 } };
  if (method !== 'POST') return { status: 405, headers: { Allow: 'GET, POST' }, json: { error: 'Send a POST request with {messages}.' } };
  // ALLOWED_ORIGIN: your site's address, or several separated by commas (your domain and its www version, for example).
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return { status: 403, json: { error: 'Not allowed.' } };

  const limit = Number(env.RATE_LIMIT_PER_10_MIN || 20);
  const who = ip || 'unknown', now = Date.now();
  const recent = (hits.get(who) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= limit) return { status: 429, json: { error: 'Too many questions. Try again in a few minutes.' } };
  recent.push(now);
  hits.set(who, recent);
  if (hits.size > 5000) hits.clear();

  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const turns = (Array.isArray(body && body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return { status: 400, json: { error: 'Send a question.' } };

  if (!profiles.has(profile)) profiles.set(profile, core.normalize(profile));
  const P = profiles.get(profile);
  // Retrieval: rank entries against the latest question (plus the previous one, for follow-ups).
  const query = turns.filter(t => t.role === 'user').slice(-2).reverse().map(t => t.content).join(' ');
  const prompt = core.buildPrompt(P, query);
  for (const p of list) {
    try {
      return { status: 200, json: { text: await askModel(p, prompt, turns, env), model: p.model } };
    } catch (e) {
      console.error('LLM call failed:', e.message);
    }
  }
  // No key yet, or every provider failed: answer straight from the profile, without AI.
  const a = core.localAnswer(P, turns[turns.length - 1].content);
  return { status: 200, json: { text: a.text + (a.ids.length ? `\n[[sources: ${a.ids.join(', ')}]]` : ''), offline: true } };
}

// For hosts that use web-standard Request and Response objects (Cloudflare Workers and Pages).
async function handleFetch(request, env, profile) {
  const send = (status, json, headers) => new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...(headers || {}) } });
  let body = {};
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length') || 0) > 100000) return send(413, { error: 'Request too large.' });
    try { body = await request.json(); } catch (e) { body = {}; }
  }
  const ip = request.headers.get('cf-connecting-ip') || String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const r = await answer({ method: request.method, origin: request.headers.get('origin'), ip, body, env, profile });
  return send(r.status, r.json, r.headers);
}

module.exports = { answer, handleFetch };
