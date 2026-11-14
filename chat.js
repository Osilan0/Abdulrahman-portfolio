(function () {
  const APP = window.APP, C = window.PortfolioCore, esc = APP.esc, icon = APP.icon;
  const $ = s => document.querySelector(s);
  const thread = $('#thread'), welcome = $('#welcome'), form = $('#form'), q = $('#q'), send = $('#send'), statusEl = $('#status'), slash = $('#slash'), newBtn = $('#newChat');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // engine: 'claude' (inside the Claude preview), 'api' (the live site's free model), 'local' (no AI: answers built from the profile)
  let engine = 'local', sample = null, busy = false, turns = [], PROMPTS = [];
  const asked = new Set();

  function setStatus(kind) {
    const map = {
      connecting: ['', 'Connecting…', ''],
      claude: ['on', 'Assistant online', 'This preview answers with Claude. The live site uses a free model.'],
      api: ['on', 'Assistant online', 'Answers come only from this portfolio.'],
      local: ['', 'Quick answers only', 'The AI is offline, so answers are compiled directly from the portfolio.']
    };
    const [cls, txt, tip] = map[kind] || map.local;
    statusEl.className = 'status ' + cls; statusEl.title = tip; statusEl.querySelector('span').textContent = txt;
  }
  async function detect() {
    if (window.claude && typeof window.claude.use === 'function') {
      setStatus('connecting');
      try { sample = await window.claude.use('sample'); } catch (e) { sample = null; }
      if (sample) { engine = 'claude'; setStatus('claude'); } else setStatus('local');
      return;
    }
    if (/^https?:$/.test(location.protocol)) {
      try { const r = await fetch('/api/chat'); const j = r.ok ? await r.json() : null; if (j && j.ok && j.ai) { engine = 'api'; setStatus('api'); return; } } catch (e) {}
    }
    setStatus('local');
  }

  const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  function md(text) {
    let html = '', list = false;
    for (const l of esc(text).split('\n')) {
      const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
      if (m) { if (!list) { html += '<ul>'; list = true; } html += '<li>' + inline(m[1]) + '</li>'; continue; }
      if (list) { html += '</ul>'; list = false; }
      if (l.trim()) html += '<p>' + inline(l) + '</p>';
    }
    return html + (list ? '</ul>' : '');
  }
  const DOTS = '<span class="dots" role="status" aria-label="Thinking"><i></i><i></i><i></i></span>';

  // The empty Ask page: a greeting, the headline and three questions to start with.
  function renderHome() {
    const P = APP.P, me = P.voice === 'first';
    PROMPTS = P.suggested.map(x => x.q);
    if (!PROMPTS.length) PROMPTS = me ? ['What are you working on now?', 'What have you built?', 'What did you do in your internships?'] : [`What is ${P.first} working on now?`, `What has ${P.first} built?`, `What did ${P.first} do in internships?`];
    const chips = PROMPTS.slice(0, 3).map(t => `<button class="prompt" type="button" data-ask="${esc(t)}">${esc(t)}</button>`).join('');
    if ($('#prompts').innerHTML !== chips) $('#prompts').innerHTML = chips;
    $('#wTitle').textContent = P.welcome.title || (!me ? P.name : APP.lang === 'ar' ? `هلا، أنا ${P.first}` : `Hi, I'm ${P.first}.`);
    $('#wSub').innerHTML = (P.welcome.subtitle || P.headline || P.greeting).split('·').map(s => `<span>${esc(s.trim())}</span>`).join('');
    q.placeholder = me ? 'Ask about my work' : `Ask about ${P.first}'s work`;
  }

  function addUser(t) {
    const d = document.createElement('div'); d.className = 'm-user'; d.dir = 'auto'; d.textContent = t;
    thread.appendChild(d);
  }
  function addBot() {
    const d = document.createElement('div'); d.className = 'm-bot';
    d.innerHTML = `<span class="av">${APP.avatar()}</span><div class="body"><div class="txt" dir="auto">${DOTS}</div></div>`;
    thread.appendChild(d);
    const body = d.querySelector('.body'), txt = d.querySelector('.txt');
    return {
      txt,
      // The answer, then one quiet row (sources on the left, copy and retry on the right), then two questions to go deeper.
      finish(out, meta) {
        txt.innerHTML = md(out.body) || '<p></p>';
        if (!meta.streamed && !reduced) txt.classList.add('fade');
        if (APP.P.booking && (out.body.includes(APP.P.booking) || /\bbook(ing)?\b|schedul|appointment|meeting|\bmeet\b|calendly/i.test(meta.question || '')))
          body.insertAdjacentHTML('beforeend', `<div class="book-cta"><button class="btn primary" type="button" data-go="contact">${icon('calendar')}Book a meeting</button></div>`);
        const items = out.ids.map(APP.itemById).filter(Boolean);
        body.insertAdjacentHTML('beforeend', `<div class="meta-row"><div class="srcs">${items.length ? `<span class="label">Sources</span>` + items.map(it => `<button class="src" type="button" data-item="${it.id}">${esc(it.title)}</button>`).join('') : ''}</div>
          <div class="tools"><button class="tool" type="button" data-act="copy" aria-label="Copy answer" title="Copy">${icon('copy')}</button><button class="tool" type="button" data-act="regen" aria-label="Answer again" title="Answer again">${icon('refresh')}</button></div></div>`);
        if (meta.note) body.insertAdjacentHTML('beforeend', `<p class="note">${esc(meta.note)}</p>`);
        const fu = (out.followups || []).filter(f => !asked.has(f)).slice(0, 2);
        const rel = fu.length ? fu : PROMPTS.filter(p => !asked.has(p)).slice(0, 2);
        if (rel.length) body.insertAdjacentHTML('beforeend', `<div class="related">${rel.map(r => `<button class="rel" type="button" data-ask="${esc(r)}">${icon('arrow')}<span>${esc(r)}</span></button>`).join('')}</div>`);
        body.querySelector('[data-act="copy"]').onclick = () => APP.copy(out.body.replace(/\*\*/g, ''), 'Answer copied');
        body.querySelector('[data-act="regen"]').onclick = () => { if (!busy) { d.remove(); turns.splice(-2, 2); APP.ask(meta.question, { regen: true }); } };
      }
    };
  }
  function scrollEnd() { const s = $('#scroll'); s.scrollTo({ top: s.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }); }
  function reset() {
    thread.innerHTML = ''; turns = []; asked.clear(); welcome.hidden = false; newBtn.hidden = true;
    q.value = ''; q.dispatchEvent(new Event('input'));
    APP.syncHome();
  }
  APP.newChat = () => { reset(); APP.go('assistant'); q.focus({ preventScroll: true }); };
  newBtn.onclick = APP.newChat;

  APP.ask = async function (text, opts = {}) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text || busy) return;
    busy = true; send.disabled = true; welcome.hidden = true; newBtn.hidden = false; closeSlash();
    APP.go('assistant', { keepScroll: true });
    thread.querySelectorAll('.related').forEach(x => x.remove()); // only the latest answer suggests next questions
    if (!opts.regen) addUser(text);
    asked.add(text);
    const P = APP.P;
    const prevUser = turns.filter(t => t.role === 'user').slice(-1).map(t => t.content).join(' ');
    const query = (text + ' ' + prevUser).trim();
    const b = addBot();
    scrollEnd();
    turns.push({ role: 'user', content: text });
    let raw = '', note = '', streamed = false;
    try {
      if (engine === 'claude') {
        const r = await sample([{ role: 'user', content: C.buildPrompt(P, query) + "\n\nThe visitor's messages follow. Answer the last one." }, ...turns.slice(-8)],
          { cache: false, modelTier: 'quick', onText: ({ text }) => { const t = C.streamView(text); if (t) { streamed = true; b.txt.innerHTML = md(t); scrollEnd(); } } });
        raw = r.text;
      } else if (engine === 'api') {
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-8), lang: APP.lang }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.text) throw { code: r.status === 429 ? 'rate_limited' : 'upstream_error' };
        raw = j.text;
        if (j.offline) note = 'The AI is busy, so this answer was compiled directly from the portfolio.';
      }
    } catch (e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { engine = 'local'; setStatus('local'); }
      note = code === 'rate_limited' ? 'The assistant is at capacity, so this answer was compiled directly from the portfolio.' : 'The AI did not respond, so this answer was compiled directly from the portfolio.';
      raw = '';
    }
    let out;
    if (raw) out = C.parseReply(raw, P);
    else { const a = C.localAnswer(P, text); out = { body: a.text, ids: a.ids, followups: a.followups || [] }; if (!note) note = 'Compiled directly from the portfolio. The AI is offline in this view.'; }
    b.finish(out, { note, question: text, streamed });
    turns.push({ role: 'assistant', content: out.body });
    busy = false; send.disabled = !q.value.trim();
    scrollEnd();
  };

  // Composer: grows with the text, Enter sends, and "/" opens shortcuts
  const CMDS = () => [
    ['/about', 'About me', () => APP.go('overview')],
    ['/startups', `Go to ${APP.P.labels.startups}`, () => APP.go('startups')], ['/projects', `Go to ${APP.P.labels.projects}`, () => APP.go('projects')],
    ['/experience', `Go to ${APP.P.labels.experience}`, () => APP.go('experience')], ['/campus', `Go to ${APP.P.labels.campus}`, () => APP.go('campus')],
    ['/honors', `Go to ${APP.P.labels.certifications}`, () => APP.go('certifications')], ['/timeline', 'Open the timeline', () => APP.go('timeline')],
    ['/resume', 'Open the résumé', () => APP.go('resume')], APP.P.booking ? ['/book', 'Book a meeting', () => APP.go('contact')] : ['/contact', 'Get in touch', () => APP.go('contact')],
    ['/search', 'Search everything', () => APP.palette && APP.palette.open()], ['/new', 'Start a new chat', () => APP.newChat()]
  ];
  let slashSel = 0, slashList = [];
  function closeSlash() { slash.hidden = true; slashList = []; }
  function renderSlash() {
    const v = q.value.trim().toLowerCase();
    if (!v.startsWith('/') || v.includes(' ')) return closeSlash();
    slashList = CMDS().filter(c => c[0].startsWith(v));
    if (!slashList.length) return closeSlash();
    slashSel = Math.min(slashSel, slashList.length - 1);
    slash.innerHTML = slashList.map((c, i) => `<button type="button" role="option" data-i="${i}" aria-selected="${i === slashSel}"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></button>`).join('');
    slash.hidden = false;
  }
  function runSlash(i) { const c = slashList[i]; if (!c) return; q.value = ''; q.dispatchEvent(new Event('input')); closeSlash(); c[2](); }
  slash.addEventListener('mousedown', e => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); runSlash(+o.dataset.i); } });
  q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(168, q.scrollHeight) + 'px'; send.disabled = busy || !q.value.trim() || q.value.trim().startsWith('/'); slashSel = 0; renderSlash(); });
  q.addEventListener('keydown', e => {
    if (!slash.hidden) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashSel = (slashSel + (e.key === 'ArrowDown' ? 1 : -1) + slashList.length) % slashList.length; renderSlash(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); runSlash(slashSel); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  q.addEventListener('blur', () => setTimeout(closeSlash, 120));
  form.addEventListener('submit', e => { e.preventDefault(); const t = q.value; if (t.trim().startsWith('/')) return; q.value = ''; q.dispatchEvent(new Event('input')); APP.ask(t); });

  APP.onProfile.push(() => { reset(); renderHome(); });
  if (APP.loaded) renderHome();
  detect();
})();
