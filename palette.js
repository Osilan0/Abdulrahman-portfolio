/* Command palette (Ctrl/Cmd + K): jump to a section, open any entry, search by skill, or ask the assistant. */
(function () {
  const APP = window.APP, C = window.PortfolioCore, esc = APP.esc, icon = APP.icon;
  const wrap = document.createElement('div');
  wrap.className = 'pal-wrap'; wrap.hidden = true;
  wrap.innerHTML = `<div class="pal" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="pal-in">${icon('search')}<input id="palQ" type="text" placeholder="Search entries, skills and sections, or ask a question…" autocomplete="off" spellcheck="false" aria-label="Search the portfolio" aria-controls="palList"><kbd>Esc</kbd></div>
      <div class="pal-list" id="palList" role="listbox" aria-label="Results"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> select</span><span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd> toggle</span></div>
    </div>`;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('#palQ'), list = wrap.querySelector('#palList');
  let results = [], sel = 0, lastFocus = null;

  function catalog() {
    const P = APP.P, out = [];
    const views = [['assistant', 'Assistant'], ['overview', 'Overview'], ['timeline', 'Timeline'], ['resume', 'Résumé'], ...C.SECTIONS.map(s => [s.key, P.labels[s.key]]), ['contact', 'Contact']];
    views.forEach(([k, label]) => out.push({ group: 'Go to', label, icon: k, keys: `${label} ${k}`, run: () => APP.go(k) }));
    C.allItems(P).forEach(it => out.push({
      group: 'Entries', label: it.title, hint: [APP.kind(it), it.status].filter(Boolean).join(' · '), icon: APP.iconFor(it),
      keys: [it.title, it.role, it.status, it.summary, ...it.tags, APP.kind(it)].join(' '),
      run: () => { APP.go(it.section === 'about' ? 'overview' : it.section); APP.openItem(it.id); }
    }));
    const tags = new Map();
    C.allItems(P).forEach(it => it.tags.forEach(t => tags.set(t.toLowerCase(), t)));
    P.skills.forEach(s => tags.set(s.toLowerCase(), s));
    [...tags.values()].forEach(t => out.push({ group: 'Skills', label: t, hint: 'Show related entries', icon: 'tag', keys: t, run: () => open(t, true) }));
    out.push({ group: 'Actions', label: 'New conversation', icon: 'plus', keys: 'new conversation chat clear reset', run: () => APP.newChat && APP.newChat() });
    if (P.booking) out.push({ group: 'Actions', label: 'Book a meeting', icon: 'calendar', keys: 'book meeting call appointment schedule calendly contact', run: () => APP.go('contact') });
    return out;
  }
  function score(item, q) {
    const label = item.label.toLowerCase(), keys = item.keys.toLowerCase();
    if (label === q) return 100;
    if (label.startsWith(q)) return 80;
    if (label.includes(q)) return 60;
    const ws = q.split(/\s+/).filter(Boolean);
    return ws.every(w => keys.includes(w)) ? 30 : 0;
  }
  function render() {
    const raw = input.value.trim(), q = raw.toLowerCase();
    const all = catalog();
    let found;
    if (!q) found = all.filter(x => x.group === 'Go to' || x.group === 'Actions');
    else {
      found = all.map(x => ({ x, s: score(x, q) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).map(r => r.x);
      const tagHit = all.find(x => x.group === 'Skills' && x.label.toLowerCase() === q);
      if (tagHit) found = found.filter(x => x.group !== 'Skills' || x === tagHit);
    }
    results = (q ? [{ group: 'Ask the assistant', label: raw, hint: 'Answered from the portfolio, with sources', icon: 'assistant', run: () => { APP.go('assistant'); APP.ask(raw); } }] : []).concat(found).slice(0, 40);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    let html = '', last = '';
    results.forEach((r, i) => {
      if (r.group !== last) { html += `<div class="pal-g">${esc(r.group)}</div>`; last = r.group; }
      html += `<button type="button" class="pal-o" role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === sel}">${icon(r.icon)}<span class="l">${esc(r.label)}</span>${r.hint ? `<span class="h">${esc(r.hint)}</span>` : ''}</button>`;
    });
    list.innerHTML = html || '<p class="pal-empty">No matches. Press Enter to ask the assistant instead.</p>';
    input.setAttribute('aria-activedescendant', results.length ? 'pal-' + sel : '');
  }
  function move(d) {
    if (!results.length) return;
    sel = (sel + d + results.length) % results.length;
    list.querySelectorAll('.pal-o').forEach(o => o.setAttribute('aria-selected', String(+o.dataset.i === sel)));
    const el = list.querySelector(`[data-i="${sel}"]`); if (el) el.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'pal-' + sel);
  }
  function choose(i) { const r = results[i]; if (!r) return; close(); r.run(); }
  function open(prefill, keepOpen) {
    if (wrap.hidden) lastFocus = document.activeElement;
    wrap.hidden = false; input.value = prefill || ''; sel = 0; render();
    input.focus({ preventScroll: true });
    if (keepOpen) input.select();
  }
  function close() { if (wrap.hidden) return; wrap.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', e => { const o = e.target.closest('.pal-o'); if (o) choose(+o.dataset.i); });
  list.addEventListener('mousemove', e => { const o = e.target.closest('.pal-o'); if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; list.querySelectorAll('.pal-o').forEach(x => x.setAttribute('aria-selected', String(x === o))); } });
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap.hidden ? open() : close(); }
  });
  APP.palette = { open, close };
})();
