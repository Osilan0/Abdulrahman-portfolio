(function () {
  const C = window.PortfolioCore;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 2.5v2 M12 19.5v2 M4.6 4.6l1.4 1.4 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4L6 18 M18 6l1.4-1.4',
    moon: 'M20 14.6A8.5 8.5 0 0 1 9.4 4a8.5 8.5 0 1 0 10.6 10.6z',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4', plus: 'M12 5v14M5 12h14', tag: 'M3 12V4h8l10 10-8 8z M7.5 7.5h.01',
    chev: 'M9 6l6 6-6 6', copy: 'M9 9h10v10H9z M5 15V5h10', link: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    arrow: 'M5 12h14 M13 6l6 6-6 6', refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7'
  };
  const icon = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[k] || PATHS.assistant}"/></svg>`;
  const LABEL = { assistant: 'Ask', overview: 'About', timeline: 'Timeline', resume: 'Résumé', contact: 'Contact' };
  const BLURB = { startups: 'Companies I founded or co-founded.', projects: 'Things I built.', experience: 'Internships and professional roles.', campus: 'Leadership and community work.', certifications: 'Courses, credentials and recognition.' };
  const VIEWS = ['assistant', 'overview', 'timeline', 'resume', ...C.SECTIONS.map(s => s.key), 'contact'];
  const APP = window.APP = { P: C.normalize({}), raw: {}, onProfile: [], esc, icon };
  APP.itemById = id => C.allItems(APP.P).find(it => it.id === id);
  APP.kind = it => APP.P.labels[it.section] || 'Education';
  APP.iconFor = it => it.section === 'about' ? 'campus' : it.section;
  APP.label = k => LABEL[k] || k;
  const initials = n => { const w = n.trim().split(/\s+/).filter(Boolean); return ((w[0] || 'Y')[0] + (w.length > 1 ? w[w.length - 1][0] : (w[0] || 'N')[1] || '')).toUpperCase(); };
  // The small round picture: the avatar from profile.json, or the initials when there is none.
  APP.avatar = () => APP.P.avatar ? `<img class="ava" src="${esc(APP.P.avatar)}" alt="">` : `<span class="mark" aria-hidden="true">${esc(initials(APP.P.name))}</span>`;
  const pill = s => s ? `<span class="stage">${esc(s)}</span>` : '';
  const tags = list => list.length ? `<div class="tags">${list.map(t => `<button type="button" class="tagb" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '';
  const block = (title, html) => `<section class="block"><h2 class="label">${esc(title)}</h2>${html}</section>`;
  const meetHTML = () => APP.P.booking ? icon('calendar') + '<span>Book<span class="hide-xs"> a meeting</span></span>' : 'Get in touch';

  function renderShell() {
    const P = APP.P;
    C.SECTIONS.forEach(s => { LABEL[s.key] = P.labels[s.key]; });
    LABEL.assistant = P.voice === 'first' ? 'Ask me' : 'Ask';
    document.title = `${P.name} · Portfolio`;
    $('#sName').textContent = P.name; $('#tName').textContent = P.name;
    $('#sHead').textContent = P.headline.split('·')[0].trim();
    ['#sAva', '#tAva', '#wAva'].forEach(s => { const el = $(s), html = APP.avatar(); if (el.innerHTML !== html) el.innerHTML = html; });
    const navBtn = k => `<button class="nav-btn" type="button" data-go="${k}">${icon(k)}<span>${esc(LABEL[k])}</span></button>`;
    const sep = '<div class="nav-sep" aria-hidden="true"></div>';
    $('#nav').innerHTML = ['assistant', 'overview'].map(navBtn).join('') + sep + C.SECTIONS.filter(s => P[s.key].length).map(s => navBtn(s.key)).join('') + sep + ['resume', 'contact'].map(navBtn).join('');
    document.querySelectorAll('.meet').forEach(b => { b.innerHTML = meetHTML(); });
    markNav();
  }
  // One entry in a list: name and dates on the first line, then the role and stage, then one sentence.
  const row = it => `<button class="row" type="button" data-item="${it.id}"><span class="row-top"><span class="title">${esc(it.title)}</span>${it.period ? `<span class="when">${esc(it.period)}</span>` : ''}</span>${it.role || it.status ? `<span class="role">${esc(it.role)}${pill(it.status)}</span>` : ''}${it.summary ? `<span class="sum">${esc(it.summary)}</span>` : ''}${it.case ? `<span class="has-case">Case study${icon('chev')}</span>` : ''}</button>`;

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
    const entry = x => `<li><button type="button" class="tl-i" data-item="${x.it.id}"><span class="tl-body"><b>${esc(x.it.title)}</b><span>${esc([x.it.role, APP.kind(x.it)].filter(Boolean).join(' · '))}</span></span>${pill(x.it.status)}${x.it.period ? `<span class="when">${esc(x.it.period)}</span>` : ''}</button></li>`;
    const chips = [['all', 'All', items.length], ...C.SECTIONS.map(s => [s.key, P.labels[s.key], items.filter(x => x.it.section === s.key).length])].filter(c => c[2]);
    $('#v-timeline').innerHTML = `<header class="sec-head"><h1>Timeline</h1><p>Every role, venture and project, newest first.</p></header>
      <div class="chips" role="group" aria-label="Filter by section">${chips.map(([k, l, n]) => `<button type="button" class="chip" data-tl="${k}" aria-pressed="${tlFilter === k}">${esc(l)}<span>${n}</span></button>`).join('')}</div>
      ${years.map(y => `<section class="tl-year"><h2>${y}</h2><ol class="tl">${dated.filter(x => Math.floor(x.t.start) === y).map(entry).join('')}</ol></section>`).join('')}
      ${undated.length ? `<section class="tl-year"><h2>Undated</h2><ol class="tl">${undated.map(entry).join('')}</ol></section>` : ''}`;
  }
  const RESUME_ORDER = ['experience', 'startups', 'projects', 'campus', 'certifications'];
  function resumeText() {
    const P = APP.P, L = [P.name, P.headline, [P.location, P.email, ...Object.values(P.links)].filter(Boolean).join(' · '), ''];
    const add = (title, list) => { if (!list.length) return; L.push(title.toUpperCase()); list.forEach(it => { L.push(`${it.title}${it.role ? ' — ' + it.role : ''}${it.period ? ' (' + it.period + ')' : ''}${it.status ? ' [' + it.status + ']' : ''}`); if (it.summary) L.push('  ' + it.summary); }); L.push(''); };
    add('Education', P.education); RESUME_ORDER.forEach(k => add(P.labels[k], P[k]));
    if (P.skills.length) L.push('SKILLS', P.skills.join(', '));
    return L.join('\n');
  }
  function renderResume() {
    const P = APP.P;
    const sec = (title, list) => list.length ? `<section class="rv-sec"><h2>${esc(title)}</h2><div class="rv-list">${list.map(it => `<button type="button" class="rv-row" data-item="${it.id}"><span class="rv-main"><b>${esc(it.title)}</b>${it.role ? `<span class="rv-role">${esc(it.role)}</span>` : ''}${it.summary ? `<span class="rv-sum">${esc(it.summary)}</span>` : ''}</span><span class="rv-side"><span>${esc(it.period)}</span>${pill(it.status)}</span></button>`).join('')}</div></section>` : '';
    $('#v-resume').innerHTML = `<article class="rv">
        <header class="rv-head"><div><h1>${esc(P.name)}</h1><p>${esc(P.headline)}</p><p class="rv-meta">${[P.location, P.email].filter(Boolean).map(esc).join(' · ')}${Object.entries(P.links).map(([k, v]) => ` · <a href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('')}</p></div>
        <div class="acts"><button class="btn" type="button" id="copyResume">${icon('copy')}Copy as text</button><button class="btn" type="button" data-go="timeline">${icon('timeline')}Timeline</button></div></header>
        ${sec('Education', P.education)}${RESUME_ORDER.map(k => sec(P.labels[k], P[k])).join('')}
        ${P.skills.length ? `<section class="rv-sec"><h2>Skills</h2>${tags(P.skills)}</section>` : ''}
      </article>`;
    $('#copyResume').onclick = () => copy(resumeText(), 'Résumé copied as plain text');
  }
  function renderViews() {
    const P = APP.P, me = P.voice === 'first', bk = P.booking, embed = isCalendly(bk);
    const linkBtns = Object.entries(P.links).map(([k, v]) => /^https?:\/\//.test(v) ? `<a class="btn" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}${icon('link')}</a>` : '').join('');
    for (const s of C.SECTIONS) {
      const list = P[s.key];
      $('#v-' + s.key).innerHTML = `<header class="sec-head"><h1>${esc(LABEL[s.key])}</h1><p>${esc(P.blurbs[s.key] || BLURB[s.key])}</p></header>
        ${list.length ? `<div class="rows">${list.map(row).join('')}</div>` : `<p class="empty">No entries yet. Add them under "${s.key}" in profile.json.</p>`}`;
    }
    // About: who I am first, then goals, skills and education.
    $('#v-overview').innerHTML = `<div class="about-top">${P.photo ? `<img class="portrait" src="${esc(P.photo)}" alt="Portrait of ${esc(P.name)}" width="192" height="256">` : ''}
        <div><h1>${esc(P.name)}</h1>${P.headline ? `<p class="head">${P.headline.split('·').map(s => `<span>${esc(s.trim())}</span>`).join('')}</p>` : ''}${P.location ? `<p class="loc">${esc(P.location)}</p>` : ''}${P.availability ? `<p class="loc">${esc(P.availability)}</p>` : ''}
        <div class="acts"><button class="btn primary" type="button" data-go="contact">${meetHTML()}</button><button class="btn" type="button" data-go="resume">${icon('resume')}Résumé</button></div></div></div>
      ${P.about ? `<p class="lead">${esc(P.about)}</p>` : ''}
      ${P.goals.length ? block(me ? "What I'm working toward" : 'Goals', `<ul>${P.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>`) : ''}
      ${P.lookingFor ? block('Currently seeking', `<p>${esc(P.lookingFor)}</p>`) : ''}
      ${P.skills.length ? block('Skills', tags(P.skills) + `<p class="hint">Select a skill to see where ${me ? 'I' : P.first} used it.</p>`) : ''}
      ${P.education.length ? block('Education', `<div class="rows">${P.education.map(row).join('')}</div>`) : ''}`;
    $('#v-contact').innerHTML = `<header class="sec-head"><h1>${bk ? 'Book a meeting' : 'Get in touch'}</h1><p>${esc(P.lookingFor || 'Open to conversations about my work.')}</p></header>
      ${bk ? `<section class="booking" aria-label="Book a meeting"><div class="booking-bar"><span class="booking-t">${icon('calendar')}${embed ? 'Pick a time that works for you' : 'Book a time online'}</span><a class="btn${embed ? '' : ' primary'}" href="${esc(bk)}" target="_blank" rel="noopener">${embed ? 'Open in Calendly' : 'Open booking page'}${icon('link')}</a></div>${embed ? '<div class="cal" id="cal"><p class="cal-wait">Loading available times…</p></div>' : ''}</section>` : ''}
      ${P.email ? block('Email', `<div class="mail"><span>${esc(P.email)}</span><button class="btn" type="button" id="copyMail">${icon('copy')}Copy address</button></div>`) : ''}
      ${linkBtns ? block('Elsewhere', `<div class="acts">${linkBtns}</div>`) : ''}
      ${P.location ? block('Based in', `<p>${esc(P.location)}</p>`) : ''}`;
    const cm = $('#copyMail'); if (cm) cm.onclick = () => copy(P.email, 'Email address copied');
    if (!$('#v-contact').hidden) mountBooking();
    renderTimeline(); renderResume();
  }
  function copy(text, ok) {
    try { navigator.clipboard.writeText(text).then(() => toast(ok), () => toast('Select the text to copy it')); } catch (e) { toast('Select the text to copy it'); }
  }
  APP.copy = copy;

  // Detail panel: the summary first, then highlights, then the longer case study.
  const drawer = $('#drawer'), scrim = $('#scrim'), app = $('#app'), main = $('#main');
  let lastFocus = null;
  APP.openItem = function (id) {
    const it = APP.itemById(id); if (!it) return;
    const P = APP.P, me = P.voice === 'first', c = it.case;
    lastFocus = document.activeElement;
    $('#dKind').textContent = APP.kind(it);
    const steps = c ? [['Problem', c.problem], ['Approach', c.approach], ['Evidence', c.evidence], ['Next', c.next]].filter(([, v]) => v) : [];
    $('#dBody').innerHTML = `<h2>${esc(it.title)}</h2>${it.role ? `<p class="d-role">${esc(it.role)}</p>` : ''}
      ${it.period || it.status ? `<p class="d-line">${it.period ? `<span class="when">${esc(it.period)}</span>` : ''}${pill(it.status)}</p>` : ''}
      ${it.summary ? `<p class="d-sum">${esc(it.summary)}</p>` : ''}
      ${it.details.length ? `<section class="d-block"><h3 class="label">Highlights</h3><ul>${it.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></section>` : ''}
      ${steps.length ? `<section class="d-block"><h3 class="label">Case study</h3><dl class="case">${steps.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : ''}
      ${tags(it.tags)}`;
    $('#dFoot').innerHTML = `<button class="btn primary" type="button" data-ask="Tell me more about ${me ? 'your work at' : P.first + "'s work at"} ${esc(it.title)}">${icon('assistant')}Ask about this</button>${/^https?:\/\//.test(it.link) ? `<a class="btn" href="${esc(it.link)}" target="_blank" rel="noopener">Open link${icon('link')}</a>` : ''}`;
    $('#dBody').scrollTop = 0;
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
    const dark = document.documentElement.dataset.theme === 'dark';
    const u = new URL(url);
    u.searchParams.set('embed_domain', location.hostname || 'localhost'); u.searchParams.set('embed_type', 'Inline');
    // Colors apply on paid Calendly plans; free plans ignore them.
    u.searchParams.set('background_color', dark ? '141414' : 'ffffff'); u.searchParams.set('text_color', dark ? 'f4f4f4' : '111111'); u.searchParams.set('primary_color', dark ? 'f4f4f4' : '111111');
    const f = document.createElement('iframe');
    f.src = u.toString(); f.title = 'Book a meeting with ' + APP.P.name; f.loading = 'lazy'; f.allow = 'payment';
    f.onload = () => { const w = box.querySelector('.cal-wait'); if (w) w.remove(); };
    box.appendChild(f);
  }
  window.addEventListener('message', e => {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled') toast('Booked. Check your email for the calendar invite.');
  });

  // Theme: white by default. Visitors can switch to night mode; the choice is remembered on their device.
  function setTheme(t, save) {
    document.documentElement.dataset.theme = t;
    if (save) { try { localStorage.setItem('theme', t); } catch (e) {} }
    const b = $('#themeBtn'), label = t === 'dark' ? 'Switch to white mode' : 'Switch to night mode';
    b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', label); b.title = label;
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch (e) {}
  setTheme(savedTheme === 'dark' ? 'dark' : 'light', false);
  $('#themeBtn').onclick = () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
    const f = $('#cal iframe'); // reload the calendar so it picks up the new colors
    if (f) { f.remove(); if (!$('#v-contact').hidden) mountBooking(); }
  };

  let current = 'assistant';
  function markNav() { document.querySelectorAll('.nav-btn').forEach(b => { if (b.dataset.go === current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }
  // "home" is the empty Ask page: the photo, the greeting and the question box sit together in the middle.
  APP.syncHome = () => main.classList.toggle('home', current === 'assistant' && !$('#welcome').hidden);
  APP.go = function (view, opts = {}) {
    if (!VIEWS.includes(view)) view = 'assistant';
    current = view;
    VIEWS.forEach(v => { $('#v-' + v).hidden = v !== view; });
    $('#dock').hidden = view !== 'assistant';
    APP.syncHome(); markNav(); setNav(false); closeDrawer();
    if (location.hash.slice(1) !== view) { try { history.replaceState(null, '', '#' + view); } catch (e) {} }
    if (!opts.keepScroll) $('#scroll').scrollTop = 0;
    if (view === 'contact') mountBooking();
  };
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { APP.go(g.dataset.go); return; }
    const r = e.target.closest('[data-item]'); if (r) { APP.openItem(r.dataset.item); return; }
    const t = e.target.closest('[data-tag]'); if (t && APP.palette) { APP.palette.open(t.dataset.tag); return; }
    const f = e.target.closest('[data-tl]'); if (f) { tlFilter = f.dataset.tl; renderTimeline(); return; }
    const p = e.target.closest('[data-palette]'); if (p && APP.palette) { setNav(false); APP.palette.open(); return; }
    const a = e.target.closest('[data-ask]'); if (a && APP.ask) { closeDrawer(); APP.ask(a.dataset.ask); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); setNav(false); } });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== current) APP.go(v, { keepScroll: true }); });

  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
  APP.toast = toast;
  APP.setProfile = function (raw) {
    APP.raw = raw; APP.P = C.normalize(raw); APP.loaded = true;
    renderShell(); renderViews();
    APP.onProfile.forEach(f => f());
  };

  // index.html already shows the name, photo and greeting, so nothing flickers while the profile loads.
  fetch('profile.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(APP.setProfile).catch(() => APP.setProfile({ name: 'Your Name' }));
  APP.go(location.hash.slice(1) || 'assistant', { keepScroll: true });
})();
