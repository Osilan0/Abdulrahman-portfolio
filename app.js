(function () {
  const C = window.PortfolioCore;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  const PATHS = {
    assistant: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z M18.5 15.5v4 M16.5 17.5h4',
    overview: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20c1.4-3.4 4.3-5 7.5-5s6.1 1.6 7.5 5',
    timeline: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    resume: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7 M9 8h3',
    startups: 'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16 M14 9h5a1 1 0 0 1 1 1v11 M3 21h18 M7.5 8h3 M7.5 12h3 M7.5 16h3 M17 13h.01 M17 17h.01',
    projects: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5 8-4.5 M12 12v9',
    experience: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3 M3 13h18',
    campus: 'M2.5 9L12 4.5 21.5 9 12 13.5z M6.5 11v5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-5 M21.5 9v5.5',
    certifications: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8.6 14l-1.6 7 5-2.8 5 2.8-1.6-7',
    contact: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M3 7l9 6 9-6',
    calendar: 'M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M3 10.5h18 M8 3.5v4 M16 3.5v4',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4', plus: 'M12 5v14M5 12h14', tag: 'M3 12V4h8l10 10-8 8z M7.5 7.5h.01',
    chev: 'M9 6l6 6-6 6', copy: 'M9 9h10v10H9z M5 15V5h10', link: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    arrow: 'M7 17L17 7M8 7h9v9', refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7', check: 'M5 12l4 4 10-10',
    up: 'M7 10v10H4V10z M7 10l4-7c1.5 0 2.5 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7',
    down: 'M7 14V4H4v10z M7 14l4 7c1.5 0 2.5-1 2.5-2.5V15h5a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.3 4H7'
  };
  const icon = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[k] || PATHS.assistant}"/></svg>`;
  const LABEL = { assistant: 'Assistant', overview: 'Overview', timeline: 'Timeline', resume: 'Résumé', contact: 'Contact' };
  const BLURB = { startups: 'Companies I founded or co-founded.', projects: 'Things I built.', experience: 'Internships and professional roles.', campus: 'Leadership and community work.', certifications: 'Courses, credentials and recognition.' };
  const VIEWS = ['assistant', 'overview', 'timeline', 'resume', ...C.SECTIONS.map(s => s.key), 'contact'];
  const APP = window.APP = { P: C.normalize({}), raw: {}, sample: null, onProfile: [], esc, store, icon };
  APP.itemById = id => C.allItems(APP.P).find(it => it.id === id);
  APP.kind = it => APP.P.labels[it.section] || 'Education';
  APP.iconFor = it => it.section === 'about' ? 'campus' : it.section;
  const initials = n => { const w = n.trim().split(/\s+/).filter(Boolean); return ((w[0] || 'Y')[0] + (w.length > 1 ? w[w.length - 1][0] : (w[0] || 'N')[1] || '')).toUpperCase(); };
  APP.initials = () => initials(APP.P.name);
  const pill = s => s ? `<span class="stage">${esc(s)}</span>` : '';
  const tags = list => list.length ? `<div class="tags">${list.map(t => `<button type="button" class="tagb" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '';

  function renderShell() {
    const P = APP.P;
    C.SECTIONS.forEach(s => { LABEL[s.key] = P.labels[s.key]; });
    $('#sName').textContent = P.name; $('#sHead').textContent = P.headline; $('#mark').textContent = initials(P.name);
    document.title = `${P.name} · Portfolio assistant`;
    const av = $('#avail'); av.hidden = !P.availability; av.querySelector('span').textContent = P.availability;
    const navBtn = k => `<button class="nav-btn" type="button" data-go="${k}">${icon(k)}<span>${esc(LABEL[k])}</span>${P[k] ? `<span class="n">${P[k].length}</span>` : ''}</button>`;
    $('#navWork').innerHTML = ['assistant', 'overview', 'timeline', 'resume'].map(navBtn).join('');
    $('#navPort').innerHTML = [...C.SECTIONS.map(s => s.key), 'contact'].map(navBtn).join('');
    markNav();
  }
  APP.stats = () => ['startups', 'experience', 'campus', 'certifications', 'projects'].filter(k => APP.P[k].length).slice(0, 4).map(k => ({ n: APP.P[k].length, label: APP.P.labels[k], k }));
  const statsHTML = () => APP.stats().map(s => `<button type="button" class="stat" data-go="${s.k}"><b>${s.n}</b><span>${esc(s.label)}</span></button>`).join('');
  const row = it => `<button class="row" type="button" data-item="${it.id}"><span class="when">${it.period ? `<span>${esc(it.period)}</span>` : ''}${pill(it.status)}</span><span><h3>${esc(it.title)}</h3>${it.role ? `<p class="role">${esc(it.role)}</p>` : ''}${it.summary ? `<p>${esc(it.summary)}</p>` : ''}${it.case ? `<span class="has-case">${icon('arrow')}Case study</span>` : ''}</span><span class="chev">${icon('chev')}</span></button>`;

  function parsePeriod(p) {
    const M = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, spring: 2, summer: 5, fall: 8, autumn: 8, winter: 11 };
    const d = new Date(), nowY = d.getFullYear() + d.getMonth() / 12;
    const one = s => { const y = s.match(/(19|20)\d{2}/); if (!y) return /now|present|current/.test(s) ? nowY : null; const m = Object.keys(M).find(k => s.includes(k)); return +y[0] + (m ? M[m] / 12 : 0); };
    const parts = String(p).toLowerCase().split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/);
    const a = one(parts[0] || ''); if (a == null) return null;
    return { start: a, end: parts.length > 1 ? (one(parts[1]) ?? a) : a };
  }
  let tlFilter = 'all';
  function renderTimeline() {
    const P = APP.P;
    const items = C.allItems(P).filter(it => it.section !== 'about').map(it => ({ it, t: parsePeriod(it.period) }));
    const shown = items.filter(x => tlFilter === 'all' || x.it.section === tlFilter);
    const dated = shown.filter(x => x.t).sort((a, b) => b.t.start - a.t.start), undated = shown.filter(x => !x.t);
    const years = [...new Set(dated.map(x => Math.floor(x.t.start)))];
    const entry = x => `<li><button type="button" class="tl-i" data-item="${x.it.id}"><span class="tl-dot" aria-hidden="true"></span><span class="tl-when">${esc(x.it.period)}</span><span class="tl-body"><b>${esc(x.it.title)}</b><span>${esc([x.it.role, APP.kind(x.it)].filter(Boolean).join(' · '))}</span></span>${pill(x.it.status)}</button></li>`;
    const chips = [['all', 'All', items.length], ...C.SECTIONS.map(s => [s.key, P.labels[s.key], items.filter(x => x.it.section === s.key).length])].filter(c => c[2]);
    $('#v-timeline').innerHTML = `<header class="sec-head"><p class="eyebrow">${dated.length + undated.length} entries</p><h1>Timeline</h1><p>Every role, venture and project, newest first.</p></header>
      <div class="chips" role="group" aria-label="Filter by section">${chips.map(([k, l, n]) => `<button type="button" class="chip" data-tl="${k}" aria-pressed="${tlFilter === k}">${esc(l)}<span>${n}</span></button>`).join('')}</div>
      ${years.map(y => `<section class="tl-year"><h2>${y}</h2><ol class="tl">${dated.filter(x => Math.floor(x.t.start) === y).map(entry).join('')}</ol></section>`).join('')}
      ${undated.length ? `<section class="tl-year"><h2>Undated</h2><ol class="tl">${undated.map(entry).join('')}</ol></section>` : ''}`;
  }
  const RESUME_ORDER = ['experience', 'startups', 'projects', 'campus', 'certifications'];
  function resumeText() {
    const P = APP.P, L = [P.name, P.headline, [P.location, P.email, ...Object.values(P.links)].filter(Boolean).join(' · '), ''];
    const block = (title, list) => { if (!list.length) return; L.push(title.toUpperCase()); list.forEach(it => { L.push(`${it.title}${it.role ? ' — ' + it.role : ''}${it.period ? ' (' + it.period + ')' : ''}${it.status ? ' [' + it.status + ']' : ''}`); if (it.summary) L.push('  ' + it.summary); }); L.push(''); };
    block('Education', P.education); RESUME_ORDER.forEach(k => block(P.labels[k], P[k]));
    if (P.skills.length) L.push('SKILLS', P.skills.join(', '));
    return L.join('\n');
  }
  function renderResume() {
    const P = APP.P;
    const block = (title, list) => list.length ? `<section class="rv-sec"><h2>${esc(title)}</h2><div class="rv-list">${list.map(it => `<button type="button" class="rv-row" data-item="${it.id}"><span class="rv-main"><b>${esc(it.title)}</b>${it.role ? `<span class="rv-role">${esc(it.role)}</span>` : ''}${it.summary ? `<span class="rv-sum">${esc(it.summary)}</span>` : ''}</span><span class="rv-side"><span>${esc(it.period)}</span>${pill(it.status)}</span></button>`).join('')}</div></section>` : '';
    $('#v-resume').innerHTML = `<article class="rv">
        <header class="rv-head"><div><h1>${esc(P.name)}</h1><p>${esc(P.headline)}</p><p class="rv-meta">${[P.location, P.email].filter(Boolean).map(esc).join(' · ')}${Object.entries(P.links).map(([k, v]) => ` · <a href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('')}</p></div>
        <div class="acts"><button class="btn" type="button" id="copyResume">${icon('copy')}Copy as text</button><button class="btn primary" type="button" data-go="assistant">${icon('assistant')}Ask the assistant</button></div></header>
        ${block('Education', P.education)}${RESUME_ORDER.map(k => block(P.labels[k], P[k])).join('')}
        ${P.skills.length ? `<section class="rv-sec"><h2>Skills</h2>${tags(P.skills)}</section>` : ''}
      </article>`;
    $('#copyResume').onclick = () => copy(resumeText(), 'Résumé copied as plain text');
  }
  function renderViews() {
    const P = APP.P, me = P.voice === 'first';
    for (const s of C.SECTIONS) {
      const list = P[s.key];
      $('#v-' + s.key).innerHTML = `<header class="sec-head"><p class="eyebrow">${list.length} ${list.length === 1 ? 'entry' : 'entries'}</p><h1>${esc(LABEL[s.key])}</h1><p>${esc(P.blurbs[s.key] || BLURB[s.key])}</p>
          <div class="acts"><button class="btn" type="button" data-ask="Give me an overview of ${me ? 'your' : P.first + "'s"} ${esc(LABEL[s.key].toLowerCase())}">${icon('assistant')}Ask the assistant</button></div></header>
        ${list.length ? `<div class="rows">${list.map(row).join('')}</div>` : `<p class="empty">No entries yet. Add them under "${s.key}" in profile.json.</p>`}`;
    }
    $('#v-overview').innerHTML = `<div class="profile"><span class="mark" aria-hidden="true">${esc(initials(P.name))}</span><div><p class="eyebrow">${esc(P.location || 'Profile')}</p><h1 class="ov-name">${esc(P.name)}</h1><p class="ov-head">${esc(P.headline)}</p></div></div>
      <div class="stats">${statsHTML()}</div>
      ${P.about ? `<p class="lead">${esc(P.about)}</p>` : ''}
      <div class="two">
        <div class="panel"><h2>Objectives</h2>${P.goals.length ? `<ul>${P.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p>Not added yet.</p>'}${P.lookingFor ? `<h2 style="margin-top:8px">Currently seeking</h2><p>${esc(P.lookingFor)}</p>` : ''}</div>
        <div class="panel"><h2>Capabilities</h2>${P.skills.length ? tags(P.skills) : '<p>Not added yet.</p>'}<p class="hint">Click a skill to see where I used it.</p></div>
      </div>
      ${P.education.length ? `<p class="sub-h">Education</p><div class="rows">${P.education.map(row).join('')}</div>` : ''}
      <div class="acts" style="margin-top:30px"><button class="btn primary" type="button" data-go="resume">${icon('resume')}Résumé view</button><button class="btn" type="button" data-go="timeline">${icon('timeline')}Timeline</button><button class="btn" type="button" data-go="assistant">${icon('assistant')}Ask the assistant</button></div>`;
    const bk = P.booking, embed = isCalendly(bk);
    $('#v-contact').innerHTML = `<header class="sec-head"><p class="eyebrow">Contact</p><h1>${bk ? 'Book a meeting' : 'Request a meeting'}</h1><p>${esc(P.lookingFor || 'Open to conversations about my work.')}</p></header>
      ${bk ? `<section class="booking" aria-label="Book a meeting"><div class="booking-bar"><span class="booking-t">${icon('calendar')}${embed ? 'Pick a time that works for you' : 'Book a time online'}</span><a class="btn${embed ? '' : ' primary'}" href="${esc(bk)}" target="_blank" rel="noopener">${embed ? 'Open in Calendly' : 'Open booking page'}${icon('link')}</a></div>${embed ? '<div class="cal" id="cal"><p class="cal-wait">Loading available times…</p></div>' : ''}</section>` : ''}
      <div class="panel">${P.email ? `<h2>Email</h2><div class="mail"><span>${esc(P.email)}</span><button class="btn" type="button" id="copyMail">${icon('copy')}Copy address</button></div>` : ''}
      ${Object.keys(P.links).length ? `<h2>Profiles</h2><div class="acts" style="margin-top:0">${Object.entries(P.links).map(([k, v]) => /^https?:\/\//.test(v) ? `<a class="btn" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}${icon('link')}</a>` : '').join('')}</div>` : ''}
      ${P.location ? `<h2 style="margin-top:10px">Based in</h2><p>${esc(P.location)}</p>` : ''}</div>`;
    const cm = $('#copyMail'); if (cm) cm.onclick = () => copy(P.email, 'Email address copied');
    const mb = $('#meetBtn'); if (mb) mb.innerHTML = bk ? icon('calendar') + 'Book a meeting' : 'Request a meeting';
    if (!$('#v-contact').hidden) mountBooking();
    $('#stats').innerHTML = statsHTML();
    renderTimeline(); renderResume();
  }
  function copy(text, ok) {
    try { navigator.clipboard.writeText(text).then(() => toast(ok), () => toast('Select the text to copy it')); } catch (e) { toast('Select the text to copy it'); }
  }
  APP.copy = copy;

  const drawer = $('#drawer'), scrim = $('#scrim'), app = $('#app');
  let lastFocus = null;
  APP.openItem = function (id) {
    const it = APP.itemById(id); if (!it) return;
    const P = APP.P, me = P.voice === 'first', c = it.case;
    lastFocus = document.activeElement;
    $('#dKind').textContent = APP.kind(it);
    const steps = c ? [['Problem', c.problem], ['Approach', c.approach], ['Evidence', c.evidence], ['Next', c.next]].filter(([, v]) => v) : [];
    $('#dBody').innerHTML = `<h2>${esc(it.title)}</h2>${it.role ? `<p class="role">${esc(it.role)}</p>` : ''}
      <dl class="meta">${it.status ? `<dt>Stage</dt><dd>${esc(it.status)}</dd>` : ''}${it.period ? `<dt>Period</dt><dd>${esc(it.period)}</dd>` : ''}<dt>Section</dt><dd>${esc(APP.kind(it))}</dd></dl>
      ${it.summary ? `<p class="d-sum">${esc(it.summary)}</p>` : ''}
      ${steps.length ? `<div class="case"><p class="eyebrow">Case study</p><ol class="steps">${steps.map(([k, v], i) => `<li style="--d:${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><b>${k}</b><p>${esc(v)}</p></div></li>`).join('')}</ol></div>` : ''}
      ${it.details.length ? `<div><p class="eyebrow">Highlights</p><ul>${it.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>` : ''}
      ${tags(it.tags)}`;
    $('#dFoot').innerHTML = `<button class="btn primary" type="button" data-ask="Tell me more about ${me ? 'your work at' : P.first + "'s work at"} ${esc(it.title)}">${icon('assistant')}Ask about this</button>${/^https?:\/\//.test(it.link) ? `<a class="btn" href="${esc(it.link)}" target="_blank" rel="noopener">Open link${icon('link')}</a>` : ''}`;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.classList.add('on');
    $('#dClose').focus({ preventScroll: true });
  };
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    if (!app.classList.contains('nav-open')) scrim.classList.remove('on');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  APP.closeDrawer = closeDrawer;
  function setNav(open) { app.classList.toggle('nav-open', open); $('#menuBtn').setAttribute('aria-expanded', open); scrim.classList.toggle('on', open || drawer.classList.contains('open')); }
  $('#menuBtn').onclick = () => setNav(!app.classList.contains('nav-open'));
  scrim.onclick = () => { closeDrawer(); setNav(false); };
  $('#dClose').onclick = closeDrawer;

  // Booking: a Calendly link in profile.json becomes a calendar on the Contact page, loaded only when that page opens.
  function isCalendly(url) { return /^https:\/\/(www\.)?calendly\.com\/[^\s"'<>]+$/i.test(url || ''); }
  function mountBooking() {
    const box = $('#cal'), url = APP.P.booking;
    if (!box || box.querySelector('iframe') || !isCalendly(url)) return;
    const t = document.documentElement.dataset.theme, dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const u = new URL(url);
    u.searchParams.set('embed_domain', location.hostname || 'localhost'); u.searchParams.set('embed_type', 'Inline');
    // Colors apply on paid Calendly plans; free plans ignore them.
    u.searchParams.set('background_color', dark ? '121212' : 'ffffff'); u.searchParams.set('text_color', dark ? 'fafafa' : '0a0a0a'); u.searchParams.set('primary_color', dark ? 'fafafa' : '0a0a0a');
    const f = document.createElement('iframe');
    f.src = u.toString(); f.title = 'Book a meeting with ' + APP.P.name; f.loading = 'lazy'; f.allow = 'payment';
    f.onload = () => { const w = box.querySelector('.cal-wait'); if (w) w.remove(); };
    box.appendChild(f);
  }
  window.addEventListener('message', e => {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled') toast('Booked. Check your email for the calendar invite.');
  });

  let current = 'assistant';
  function markNav() { document.querySelectorAll('.nav-btn').forEach(b => { if (b.dataset.go === current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }
  APP.go = function (view, opts = {}) {
    if (!VIEWS.includes(view)) view = 'assistant';
    current = view;
    VIEWS.forEach(v => { $('#v-' + v).hidden = v !== view; });
    $('#dock').hidden = view !== 'assistant';
    $('#crumbs').innerHTML = `Portfolio <span aria-hidden="true">/</span> <b>${esc(LABEL[view])}</b>`;
    markNav(); setNav(false); closeDrawer();
    if (location.hash.slice(1) !== view) { try { history.replaceState(null, '', '#' + view); } catch (e) {} }
    if (!opts.keepScroll) $('#scroll').scrollTop = 0;
    if (view === 'contact') mountBooking();
  };
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { APP.go(g.dataset.go); return; }
    const r = e.target.closest('[data-item]'); if (r) { APP.openItem(r.dataset.item); return; }
    const t = e.target.closest('[data-tag]'); if (t && APP.palette) { APP.palette.open(t.dataset.tag); return; }
    const f = e.target.closest('[data-tl]'); if (f) { tlFilter = f.dataset.tl; renderTimeline(); return; }
    const p = e.target.closest('[data-palette]'); if (p && APP.palette) { APP.palette.open(); return; }
    const a = e.target.closest('[data-ask]'); if (a && APP.ask) { closeDrawer(); APP.ask(a.dataset.ask); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#importer').hidden) { $('#importer').hidden = true; return; }
    closeDrawer(); setNav(false);
  });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== current) APP.go(v, { keepScroll: true }); });

  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
  APP.toast = toast;
  APP.setProfile = function (raw, persist) {
    APP.raw = raw; APP.P = C.normalize(raw);
    renderShell(); renderViews();
    if (persist) store.set('pc.profile', JSON.stringify(raw));
    APP.onProfile.forEach(f => f());
  };

  // Importer (only inside the Claude preview, never on the public site)
  const imp = $('#importer');
  const tabs = { resume: [$('#tabResume'), $('#paneResume')], json: [$('#tabJson'), $('#paneJson')] };
  function tab(k) { Object.entries(tabs).forEach(([n, [b, p]]) => { b.setAttribute('aria-selected', n === k); p.hidden = n !== k; }); if (k === 'json') $('#jsonText').value = JSON.stringify(APP.raw, null, 2); }
  $('#loadBtn').onclick = () => { imp.hidden = false; $('#tabResume').hidden = !APP.sample; tab(APP.sample ? 'resume' : 'json'); setNav(false); };
  $('#impClose').onclick = () => { imp.hidden = true; };
  imp.addEventListener('click', e => { if (e.target === imp) imp.hidden = true; });
  $('#tabResume').onclick = () => tab('resume'); $('#tabJson').onclick = () => tab('json');
  $('#applyBtn').onclick = () => {
    const m = $('#jsonMsg');
    try { const raw = JSON.parse($('#jsonText').value); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the profile must be one JSON object'); APP.setProfile(raw, true); m.className = 'msgline'; m.textContent = 'Applied.'; toast('Profile updated'); }
    catch (err) { m.className = 'msgline err'; m.textContent = 'That is not valid JSON: ' + err.message; }
  };
  $('#copyBtn').onclick = () => copy($('#jsonText').value, 'JSON copied');
  $('#resetBtn').onclick = () => { store.set('pc.profile', null); loadDefault().then(() => { tab('json'); toast('Original profile restored'); }); };
  $('#buildBtn').onclick = async () => {
    const text = $('#resumeText').value.trim(), msg = $('#buildMsg'), btn = $('#buildBtn');
    if (text.length < 40) { msg.className = 'msgline err'; msg.textContent = 'Paste a little more: your resume or a few paragraphs about your work.'; return; }
    if (!APP.sample) { msg.className = 'msgline err'; msg.textContent = 'Claude is not available in this view. Use the JSON tab instead.'; return; }
    btn.disabled = true; msg.className = 'msgline'; msg.textContent = 'Reading your resume. This can take up to a minute.';
    try {
      const raw = await APP.sample.json(`Turn the resume or notes below into a JSON profile for a professional portfolio website and its assistant.
Return ONLY one JSON object shaped like: {"name","headline","location","email","availability","links":{label:url},"assistant":{"voice":"first-person","greeting"},"about","goals":[],"lookingFor","skills":[],"education":[Item],"startups":[Item],"projects":[Item],"experience":[Item],"campus":[Item],"certifications":[Item],"faq":[]}
Item = {"title","role","period" like "Jun 2024 – Aug 2024" or "Sep 2023 – now","status" (real stage, e.g. "Internship", "Prelaunch"),"summary" (one sentence, first person),"details":[up to 4],"tags":[up to 5],"link"}
Use only facts stated in the text; never invent anything; use "" or [] when unknown.

TEXT:
"""
${text.slice(0, 30000)}
"""`, { modelTier: 'default', cache: false });
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw { code: 'invalid_json' };
      APP.setProfile(raw, true); imp.hidden = true; APP.go('assistant'); toast('Profile loaded. Ask the assistant a question.');
    } catch (e) {
      msg.className = 'msgline err';
      msg.textContent = e && e.code === 'not_granted' ? 'Claude access was declined, so this tab is unavailable. Use the JSON tab.' : e && e.code === 'rate_limited' ? 'Claude is busy. Try again in a minute.' : 'That did not work. Try again, or shorten the text.';
    } finally { btn.disabled = false; }
  };

  function loadDefault() {
    return fetch('profile.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(raw => APP.setProfile(raw, false)).catch(() => APP.setProfile({ name: 'Your Name' }, false));
  }
  renderShell();
  const saved = store.get('pc.profile');
  let parsed = null; try { parsed = saved && JSON.parse(saved); } catch (e) {}
  if (parsed) APP.setProfile(parsed, false); else loadDefault();
  APP.go(location.hash.slice(1) || 'assistant', { keepScroll: true });
  if (window.claude && typeof window.claude.use === 'function') $('#loadBtn').hidden = false;
})();
