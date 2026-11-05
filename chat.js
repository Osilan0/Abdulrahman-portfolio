(function () {
  const APP = window.APP, C = window.PortfolioCore, esc = APP.esc, icon = APP.icon;
  const $ = s => document.querySelector(s);
  const thread = $('#thread'), welcome = $('#welcome'), form = $('#form'), q = $('#q'), send = $('#send'), statusEl = $('#status'), recent = $('#recent'), slash = $('#slash');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  // engine: 'claude' (inside the Claude preview), 'api' (your deployed site), 'local' (no AI: answers built from the profile)
  let engine = 'local', sample = null, busy = false, turns = [], n = 0, PROMPTS = [];
  const asked = new Set();

  function setStatus(kind) {
    const map = {
      connecting: ['', 'Connecting the assistant…'],
      claude: ['on', 'Assistant online. This preview runs on Claude; the live site uses a free model.'],
      api: ['on', 'Assistant online. Grounded in this portfolio only.'],
      local: ['', 'Assistant offline. Answers are compiled directly from the portfolio.']
    };
    const [cls, txt] = map[kind] || map.local;
    statusEl.className = 'status ' + cls; statusEl.querySelector('span').textContent = txt;
  }
  async function detect() {
    if (window.claude && typeof window.claude.use === 'function') {
      setStatus('connecting');
      try { sample = await window.claude.use('sample'); } catch (e) { sample = null; }
      if (sample) { engine = 'claude'; APP.sample = sample; setStatus('claude'); } else setStatus('local');
      return;
    }
    if (/^https?:$/.test(location.protocol)) {
      try { const r = await fetch('/api/chat'); const j = r.ok ? await r.json() : null; if (j && j.ok && j.ai) { engine = 'api'; setStatus('api'); return; } } catch (e) {}
    }
    setStatus('local');
  }
  const engineLabel = model => engine === 'claude' ? 'Claude · preview' : engine === 'api' ? (model || 'Free model') : 'Offline answers';

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
  function paint(el, text, done) {
    el.innerHTML = md(text) || '<p></p>';
    if (done) return;
    let last = el.lastElementChild; if (last && last.tagName === 'UL') last = last.lastElementChild;
    if (last) last.insertAdjacentHTML('beforeend', '<span class="caret" aria-hidden="true"></span>');
  }
  function typeOut(el, full) {
    return new Promise(res => {
      if (reduced) { paint(el, full, true); return res(); }
      let i = 0; const stepN = Math.max(2, Math.ceil(full.length / 80));
      const tick = () => { i = Math.min(full.length, i + stepN); paint(el, full.slice(0, i), i >= full.length); if (i < full.length) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
  }

  function renderPrompts() {
    const P = APP.P, me = P.voice === 'first';
    let cards = [
      ['startups', P.labels.startups, me ? 'What companies have you founded, and where are they today?' : `What companies has ${P.first} founded?`],
      ['projects', P.labels.projects, me ? 'What have you built?' : `What has ${P.first} built?`],
      ['experience', P.labels.experience, me ? 'What did you deliver during your internships?' : `What did ${P.first} deliver during internships?`],
      ['campus', P.labels.campus, me ? 'How have you led on campus?' : `How has ${P.first} led on campus?`],
      ['certifications', P.labels.certifications, me ? 'What recognition have you received?' : `What recognition has ${P.first} received?`],
      ['overview', 'About', me ? 'Why do you build products?' : `Why does ${P.first} build products?`]
    ].filter(([k]) => k === 'overview' || (P[k] && P[k].length));
    if (P.suggested.length) cards = P.suggested.map(x => [x.section, P.labels[x.section] || 'About', x.q]);
    PROMPTS = cards.slice(0, 6).map(c => c[2]);
    $('#prompts').innerHTML = cards.slice(0, 6).map(([k, label, text]) => `<button class="prompt" type="button" data-ask="${esc(text)}"><span class="k">${icon(k)}${esc(label)}</span><span class="q">${esc(text)}</span>${icon('arrow').replace('class="i"', 'class="i arr"')}</button>`).join('');
    $('#wSub').textContent = P.greeting || `I answer questions about ${P.first}'s work, using only this portfolio.`;
  }

  function addUser(t) {
    const d = document.createElement('div'); d.className = 'm-user'; d.id = 'msg-' + (++n); d.dir = 'auto'; d.textContent = t;
    thread.appendChild(d); return d.id;
  }
  function addBot(total) {
    const d = document.createElement('div'); d.className = 'm-bot';
    const cells = Array.from({ length: total }, (_, i) => `<i style="--i:${i}"></i>`).join('');
    d.innerHTML = `<span class="av" aria-hidden="true">${esc(APP.initials())}</span><div class="body">
      <p class="who">Assistant</p>
      <div class="trace" data-open="true">
        <button class="trace-sum" type="button" aria-expanded="true"><span class="pulse" aria-hidden="true"></span><span class="ts-text">Thinking…</span>${icon('chev')}</button>
        <ol class="trace-steps">
          <li class="st" data-k="read"><i></i><span>Understanding the question</span></li>
          <li class="st" data-k="search"><i></i><span>Searching ${total} portfolio entries</span><span class="grid" aria-hidden="true">${cells}</span></li>
          <li class="st" data-k="found"><i></i><span class="f-text">Selecting relevant entries</span><span class="f-chips"></span></li>
          <li class="st" data-k="write"><i></i><span>Writing a grounded answer</span></li>
        </ol>
      </div>
      <div class="txt" dir="auto"></div></div>`;
    thread.appendChild(d);
    const body = d.querySelector('.body'), trace = d.querySelector('.trace'), txt = d.querySelector('.txt');
    const step = (k, state) => { const el = trace.querySelector(`[data-k="${k}"]`); el.classList.remove('on', 'ok'); if (state) el.classList.add(state); };
    trace.querySelector('.trace-sum').onclick = () => { const open = trace.dataset.open !== 'true'; trace.dataset.open = open; trace.querySelector('.trace-sum').setAttribute('aria-expanded', open); };
    return {
      el: d, txt,
      async animate(picked, all) {
        step('read', 'on'); await wait(260); step('read', 'ok');
        step('search', 'on'); trace.querySelector('.grid').classList.add('scan'); await wait(760);
        const hit = new Set(picked.map(it => it.id));
        trace.querySelectorAll('.grid i').forEach((c, i) => c.classList.add(hit.has(all[i].id) ? 'hit' : 'miss'));
        step('search', 'ok'); step('found', 'on');
        trace.querySelector('.f-text').textContent = `Using ${picked.length} relevant ${picked.length === 1 ? 'entry' : 'entries'}`;
        trace.querySelector('.f-chips').innerHTML = picked.slice(0, 5).map(it => `<span>${esc(it.title)}</span>`).join('') + (picked.length > 5 ? `<span>+${picked.length - 5}</span>` : '');
        await wait(420); step('found', 'ok'); step('write', 'on');
      },
      finish(out, meta) {
        step('write', 'ok');
        trace.dataset.open = 'false'; trace.querySelector('.trace-sum').setAttribute('aria-expanded', 'false');
        trace.querySelector('.ts-text').textContent = `Searched ${meta.total} entries · used ${meta.used} · ${meta.secs}s`;
        trace.classList.add('done');
        paint(txt, out.body, true);
        if (APP.P.booking && (out.body.includes(APP.P.booking) || /\bbook(ing)?\b|schedul|appointment|meeting|\bmeet\b|calendly/i.test(meta.question || '')))
          body.insertAdjacentHTML('beforeend', `<div class="book-cta"><button class="btn primary" type="button" data-go="contact">${icon('calendar')}Book a meeting</button></div>`);
        const items = out.ids.map(APP.itemById).filter(Boolean);
        d.querySelector('.who').textContent = items.length ? `Assistant · Grounded in ${items.length} source${items.length > 1 ? 's' : ''}` : 'Assistant';
        if (items.length) body.insertAdjacentHTML('beforeend', `<div class="srcs"><h3>Sources</h3>${items.map((it, i) => `<button class="src" type="button" data-item="${it.id}"><span class="num">[${i + 1}]</span>${icon(APP.iconFor(it))}<b>${esc(it.title)}</b><span>${esc([APP.kind(it), it.status].filter(Boolean).join(' · '))}</span></button>`).join('')}</div>`);
        if (meta.note) body.insertAdjacentHTML('beforeend', `<p class="note">${esc(meta.note)}</p>`);
        const fu = (out.followups || []).filter(f => !asked.has(f)).slice(0, 2);
        const rel = fu.length ? fu : PROMPTS.filter(p => !asked.has(p)).slice(0, 2);
        if (rel.length) body.insertAdjacentHTML('beforeend', `<div class="related"><span class="eyebrow">Related</span>${rel.map(r => `<button class="rel" type="button" data-ask="${esc(r)}">${esc(r)}${icon('arrow')}</button>`).join('')}</div>`);
        body.insertAdjacentHTML('beforeend', `<div class="tools"><button class="tool" type="button" data-act="copy">${icon('copy')}Copy</button><button class="tool" type="button" data-act="regen">${icon('refresh')}Regenerate</button><button class="tool icon-only" type="button" data-act="up" aria-label="Helpful" aria-pressed="false">${icon('up')}</button><button class="tool icon-only" type="button" data-act="down" aria-label="Not helpful" aria-pressed="false">${icon('down')}</button><span class="meta">${esc(engineLabel(meta.model))}</span></div>`);
        body.querySelector('[data-act="copy"]').onclick = () => APP.copy(out.body.replace(/\*\*/g, ''), 'Answer copied');
        body.querySelector('[data-act="regen"]').onclick = () => { if (!busy) { d.remove(); turns.splice(-2, 2); APP.ask(meta.question, { regen: true }); } };
        body.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(b => b.onclick = () => {
          const on = b.getAttribute('aria-pressed') !== 'true';
          body.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(x => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', on); if (on) APP.toast('Thanks for the feedback');
        });
      }
    };
  }
  function scrollEnd() { const s = $('#scroll'); s.scrollTo({ top: s.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }); }
  function addRecent(text, id) {
    const none = recent.querySelector('.none'); if (none) none.remove();
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.title = text;
    b.onclick = () => { APP.go('assistant', { keepScroll: true }); const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); };
    recent.prepend(b);
    while (recent.children.length > 8) recent.lastChild.remove();
  }
  function reset() {
    thread.innerHTML = ''; turns = []; asked.clear(); welcome.hidden = false;
    recent.innerHTML = '<p class="none">Your questions appear here.</p>';
    q.value = ''; q.dispatchEvent(new Event('input'));
  }
  APP.newChat = () => { reset(); APP.go('assistant'); q.focus({ preventScroll: true }); };
  $('#newChat').onclick = APP.newChat;

  APP.ask = async function (text, opts = {}) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text || busy) return;
    APP.go('assistant', { keepScroll: true });
    busy = true; send.disabled = true; welcome.hidden = true; closeSlash();
    if (!opts.regen) { const id = addUser(text); addRecent(text, id); }
    asked.add(text);
    const P = APP.P, all = C.allItems(P);
    const prevUser = turns.filter(t => t.role === 'user').slice(-1).map(t => t.content).join(' ');
    const query = (text + ' ' + prevUser).trim();
    const picked = C.retrieve(P, query);
    const b = addBot(all.length);
    scrollEnd();
    turns.push({ role: 'user', content: text });
    const t0 = performance.now();
    let latest = '', animDone = false, raw = '', note = '', model = '';
    const anim = b.animate(picked, all).then(() => { animDone = true; if (latest) paint(b.txt, latest, false); });
    try {
      if (engine === 'claude') {
        const r = await sample([{ role: 'user', content: C.buildPrompt(P, query) + "\n\nThe visitor's messages follow. Answer the last one." }, ...turns.slice(-8)],
          { cache: false, modelTier: 'quick', onText: ({ text }) => { latest = C.streamView(text); if (animDone) { paint(b.txt, latest, false); scrollEnd(); } } });
        raw = r.text;
      } else if (engine === 'api') {
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-8) }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.text) throw { code: r.status === 429 ? 'rate_limited' : 'upstream_error' };
        raw = j.text; model = j.model || '';
        if (j.offline) note = 'The AI is unavailable, so this answer was compiled directly from the portfolio.';
      }
    } catch (e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { engine = 'local'; APP.sample = null; setStatus('local'); }
      note = code === 'rate_limited' ? 'The assistant is at capacity, so this answer was compiled directly from the portfolio.'
        : code === 'not_granted' ? 'AI answers are disabled in this view, so this answer was compiled directly from the portfolio.'
        : 'The assistant did not respond, so this answer was compiled directly from the portfolio.';
      raw = '';
    }
    let out;
    if (raw) out = C.parseReply(raw, P);
    else { const a = C.localAnswer(P, text); out = { body: a.text, ids: a.ids, followups: a.followups || [] }; if (!note) note = 'Compiled directly from the portfolio. The AI assistant is offline in this view.'; }
    await anim;
    if (engine !== 'claude' || !raw) await typeOut(b.txt, out.body);
    b.finish(out, { total: all.length, used: picked.length, secs: ((performance.now() - t0) / 1000).toFixed(1), note, model, question: text });
    turns.push({ role: 'assistant', content: out.body });
    busy = false; send.disabled = !q.value.trim();
    scrollEnd();
  };

  // Composer: auto-grow, Enter to send, rotating example questions, and "/" commands
  const CMDS = () => [
    ['/startups', `Go to ${APP.P.labels.startups}`, () => APP.go('startups')], ['/projects', `Go to ${APP.P.labels.projects}`, () => APP.go('projects')],
    ['/experience', 'Go to Experience', () => APP.go('experience')], ['/campus', `Go to ${APP.P.labels.campus}`, () => APP.go('campus')],
    ['/honors', `Go to ${APP.P.labels.certifications}`, () => APP.go('certifications')], ['/timeline', 'Open the timeline', () => APP.go('timeline')],
    ['/resume', 'Open the résumé view', () => APP.go('resume')], APP.P.booking ? ['/book', 'Book a meeting', () => APP.go('contact')] : ['/contact', 'Request a meeting', () => APP.go('contact')],
    ['/search', 'Search everything', () => APP.palette && APP.palette.open()], ['/new', 'Start a new conversation', () => APP.newChat()]
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

  const BASE_PH = 'Ask anything about my work, or type / for commands';
  let phIdx = 0;
  async function cyclePlaceholder() {
    if (reduced) { q.placeholder = BASE_PH; return; }
    for (;;) {
      await new Promise(r => setTimeout(r, 2600));
      if (document.activeElement === q || q.value || !PROMPTS.length) { q.placeholder = BASE_PH; continue; }
      const target = 'Try: ' + PROMPTS[phIdx++ % PROMPTS.length];
      for (let i = 6; i <= target.length; i += 2) { if (document.activeElement === q || q.value) break; q.placeholder = target.slice(0, i); await new Promise(r => setTimeout(r, 28)); }
      await new Promise(r => setTimeout(r, 2200));
      if (document.activeElement !== q && !q.value) q.placeholder = BASE_PH;
    }
  }
  q.placeholder = BASE_PH;

  APP.onProfile.push(() => { reset(); renderPrompts(); });
  renderPrompts();
  detect();
  cyclePlaceholder();
})();
