// POST /api/chat: answers visitor questions using a free LLM, grounded only in profile.json.
// Works with any OpenAI-compatible provider (Groq, Google Gemini, OpenRouter, ...): set the env vars.
// Your API key stays here on the server; the browser never sees it.
const fs = require('fs');
const path = require('path');
const core = require('../core.js');

const PRIMARY = {
  base: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
  key: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL || 'openai/gpt-oss-120b'
};
// Backup model, tried when the main one fails or hits its free limit. With no FALLBACK_BASE_URL it uses the
// same provider and key, and on Groq each model has its own free limits, so a second model doubles capacity.
// (A key is never sent to a different provider: a FALLBACK_BASE_URL needs its own FALLBACK_API_KEY.)
// FALLBACK_MODEL=none turns it off.
const FB_MODEL = process.env.FALLBACK_MODEL === 'none' ? '' : process.env.FALLBACK_MODEL || (/groq\.com/i.test(PRIMARY.base) ? 'openai/gpt-oss-20b' : '');
const FALLBACK = process.env.FALLBACK_BASE_URL
  ? { base: process.env.FALLBACK_BASE_URL, key: process.env.FALLBACK_API_KEY, model: FB_MODEL }
  : { base: PRIMARY.base, key: PRIMARY.key, model: FB_MODEL };
const MAX_TURNS = 10;
const MAX_CHARS = 1000;
const LIMIT = Number(process.env.RATE_LIMIT_PER_10_MIN || 20);
const hits = new Map(); // best-effort rate limit, per warm server instance

let cached;
function knowledge() {
  if (!cached) {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'profile.json'), 'utf8'));
    const P = core.normalize(raw);
    cached = { P };
  }
  return cached;
}

async function askModel(p, system, turns) {
  const r = await fetch(p.base.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.2, // low = sticks to the facts
      max_tokens: 800,
      // gpt-oss models think before answering; "low" keeps that short, fast and cheap on free limits
      ...(/gpt-oss/i.test(p.model) ? { reasoning_effort: process.env.LLM_REASONING_EFFORT || 'low' } : {}),
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

module.exports = async function handler(req, res) {
  const providers = [PRIMARY, FALLBACK].filter((x, i, all) => x.base && x.key && x.model && !(i && x.model === all[0].model && x.base === all[0].base));
  if (req.method === 'GET') return res.status(200).json({ ok: true, ai: providers.length > 0 });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Send a POST request with {messages}.' });
  }
  // ALLOWED_ORIGIN: your site's address, or several separated by commas (your domain and its www version, for example).
  const allowed = String(process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (allowed.length && req.headers.origin && !allowed.includes(req.headers.origin)) return res.status(403).json({ error: 'Not allowed.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many questions. Try again in a few minutes.' });
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const turns = (Array.isArray(body && body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return res.status(400).json({ error: 'Send a question.' });

  const { P } = knowledge();
  // Retrieval: rank entries against the latest question (plus the previous one, for follow-ups).
  const query = turns.filter(t => t.role === 'user').slice(-2).reverse().map(t => t.content).join(' ');
  const prompt = core.buildPrompt(P, query);
  for (const p of providers) {
    try {
      return res.status(200).json({ text: await askModel(p, prompt, turns), model: p.model });
    } catch (e) {
      console.error('LLM call failed:', e.message);
    }
  }
  // No key yet, or every provider failed: answer straight from the profile, without AI.
  const a = core.localAnswer(P, turns[turns.length - 1].content);
  return res.status(200).json({ text: a.text + (a.ids.length ? `\n[[sources: ${a.ids.join(', ')}]]` : ''), offline: true });
};
