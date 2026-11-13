/* Knowledge sphere: every portfolio entry is a point on a globe you can spin.
   Each section is a constellation with its name above it. Arcs join entries that are related: neighbours in a
   section, one entry mentioning another, or a shared skill. Small signals travel along the arcs.
   Drag to rotate, hover for a name, click to open the entry. Arrow keys and Enter work too. Black and white, follows the theme. */
(function () {
  const APP = window.APP, C = window.PortfolioCore;
  const host = document.getElementById('sphere');
  if (!host || !APP) return;
  const cap = document.getElementById('sphCap');
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  const tip = document.createElement('div'); tip.className = 'sph-tip'; tip.hidden = true;
  host.append(cv, tip);
  host.tabIndex = 0; host.setAttribute('role', 'group');
  host.setAttribute('aria-label', 'Map of every entry in this portfolio. Use the arrow keys to rotate it and Enter to open the entry at the front. The same entries are listed in the sections.');
  const g = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches, rtl = APP.lang === 'ar';
  const GOLD = Math.PI * (3 - Math.sqrt(5)), TAU = Math.PI * 2, CAM = 3.4; // CAM: camera distance, in sphere radii
  let W = 1, H = 1, R = 1, dpr = 1;
  let yaw = 0, pitch = -0.2, vel = 0, glide = null;           // glide: {yaw, pitch} while turning toward a point
  let nodes = [], edges = [], clusters = [], dust = [], pulses = [], labelBoxes = [];
  let hover = null, focus = null, focusAt = 0, active = null, activeAt = 0, drag = null, keys = false;
  let ink = '17,17,17', bg = '#ffffff', frame = 0, visible = true, seen = false, born = 0;

  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fib = (n, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = i * GOLD; return [Math.cos(th) * r, y, Math.sin(th) * r]; };
  const clamp01 = t => Math.min(1, Math.max(0, t));
  const ease = t => 1 - Math.pow(1 - clamp01(t), 3);
  const front = z => (1 - z) / 2;                              // 1 at the point nearest the viewer, 0 at the back
  const aim = p => ({ yaw: Math.atan2(p[0], -p[2]), pitch: Math.max(-1.1, Math.min(1.1, Math.atan2(-p[1], Math.hypot(p[0], p[2])))) });
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function build() {
    const P = APP.P, items = C.allItems(P);
    const order = ['startups', 'projects', 'experience', 'campus', 'certifications', 'about'];
    const secs = [...new Set(items.map(it => it.section))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    clusters = secs.map((s, k) => ({ key: s, label: (P.labels[s] || 'Education').toUpperCase(), c: fib(secs.length, k), nodes: [] }));
    nodes = [];
    // Each section's entries spiral out from the section's centre, so a section reads as one constellation.
    clusters.forEach(cl => {
      const list = items.filter(it => it.section === cl.key), n = list.length;
      const a = Math.abs(cl.c[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(a, cl.c)), v = cross(cl.c, u), spread = 0.17 + 0.04 * n;
      list.forEach((it, j) => {
        const rho = n === 1 ? 0 : spread * Math.sqrt((j + 0.6) / n), phi = j * GOLD;
        const p = norm([0, 1, 2].map(i => cl.c[i] * Math.cos(rho) + (u[i] * Math.cos(phi) + v[i] * Math.sin(phi)) * Math.sin(rho)));
        const node = { it, p, cl, big: !!it.case, i: nodes.length, x: 0, y: 0, z: 0, r: 3, s: 1, dim: 1, links: new Set() };
        nodes.push(node); cl.nodes.push(node);
      });
    });
    const seen = new Set(), E = [];
    const link = (a, b, kind) => {
      if (a === b) return false;
      const key = a.i < b.i ? a.i + '-' + b.i : b.i + '-' + a.i;
      if (seen.has(key)) return false;
      seen.add(key); E.push({ a, b, kind }); a.links.add(b); b.links.add(a); return true;
    };
    clusters.forEach(cl => cl.nodes.forEach((n, j) => { if (j) link(cl.nodes[j - 1], n, 'section'); }));
    // One entry naming another ("team Wasl", "at SAIS") is a real relationship.
    const text = n => [n.it.role, n.it.summary, ...n.it.details].join(' ').toLowerCase();
    nodes.forEach(b => {
      const title = b.it.title.toLowerCase(), names = [title, title.split(' (')[0]].filter(s => (s.includes(' ') ? s.length >= 6 : s.length >= 3));
      const re = names.length ? new RegExp('(^|[^a-z0-9])(' + names.map(rx).join('|') + ')($|[^a-z0-9])') : null;
      if (re) nodes.forEach(a => { if (a !== b && re.test(text(a))) link(a, b, 'mention'); });
    });
    // A shared skill links entries across sections (at most two such links per entry, to keep the picture readable).
    const deg = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i], ta = new Set(a.it.tags.map(t => t.toLowerCase()));
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        if (a.cl === b.cl || (deg.get(a) || 0) >= 2 || (deg.get(b) || 0) >= 2 || !b.it.tags.some(t => ta.has(t.toLowerCase()))) continue;
        if (link(a, b, 'skill')) { deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); }
      }
    }
    // Arcs follow the surface of the globe and rise a little in the middle, like flight paths.
    edges = E.map(e => {
      const om = Math.acos(Math.max(-1, Math.min(1, dot(e.a.p, e.b.p)))) || 0.001, n = Math.max(6, Math.round(8 + om * 9));
      const lift = e.kind === 'section' ? 0.008 + 0.02 * om : 0.015 + 0.032 * om, s = Math.sin(om), pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, A = Math.sin((1 - t) * om) / s, B = Math.sin(t * om) / s, h = 1 + lift * Math.sin(Math.PI * t);
        pts.push([(e.a.p[0] * A + e.b.p[0] * B) * h, (e.a.p[1] * A + e.b.p[1] * B) * h, (e.a.p[2] * A + e.b.p[2] * B) * h]);
      }
      return { a: e.a, b: e.b, pts, scr: new Float32Array((n + 1) * 3) };
    });
    dust = Array.from({ length: 220 }, (_, i) => fib(220, i));
    pulses = []; hover = focus = active = null;
    const first = clusters[0];
    if (first) { const t = aim(first.c); yaw = t.yaw + 0.3; pitch = t.pitch * 0.6 - 0.12; }
    if (cap) cap.textContent = `${items.length} entries · drag to rotate · ${coarse ? 'tap' : 'click'} a dot to open`;
  }
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const m = (cs.getPropertyValue('--ink') || '#111111').trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    ink = m ? [1, 2, 3].map(i => parseInt(m[i], 16)).join(',') : '17,17,17';
    bg = (cs.getPropertyValue('--bg') || '#ffffff').trim();
  }
  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); R = Math.min(W, H) * 0.4;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const frontNode = () => nodes.reduce((best, n) => (!best || n.z < best.z ? n : best), null);
  function burst(n) { // signals leave the entry that just lit up
    if (reduced) return;
    edges.filter(e => e.a === n || e.b === n).slice(0, 5).forEach(e => pulses.push({ e, t: 0, v: 0.016 + Math.random() * 0.008, rev: e.b === n }));
  }

  function draw(now) {
    const t = reduced ? 1 : clamp01((now - born) / 1500);      // the sphere assembles itself over 1.5 s
    const yw = yaw - (1 - ease(t)) * 1.3;
    const cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pitch), sp = Math.sin(pitch), ox = W / 2, oy = H / 2;
    const proj = (x, y, z, out, o) => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, k = CAM / (CAM + z2);
      out[o] = ox + x1 * R * k; out[o + 1] = oy + y2 * R * k; out[o + 2] = z2; return k;
    };
    const tmp = [0, 0, 0];
    g.clearRect(0, 0, W, H);

    // The globe itself: soft shading and a faint outline
    const rim = R * CAM / Math.sqrt(CAM * CAM - 1);
    const fl = oy + rim * 1.07, sh = g.createRadialGradient(ox, fl, 0, ox, fl, rim * 0.95);
    sh.addColorStop(0, `rgba(${ink},${(0.085 * ease(t / 0.6)).toFixed(3)})`); sh.addColorStop(1, `rgba(${ink},0)`);
    g.save(); g.translate(0, fl); g.scale(1, 0.085); g.translate(0, -fl); g.fillStyle = sh; g.beginPath(); g.arc(ox, fl, rim * 0.95, 0, TAU); g.fill(); g.restore();
    const shade = g.createRadialGradient(ox - R * 0.32, oy - R * 0.36, R * 0.05, ox, oy, rim);
    shade.addColorStop(0, `rgba(${ink},0.06)`); shade.addColorStop(1, `rgba(${ink},0.012)`);
    g.fillStyle = shade; g.beginPath(); g.arc(ox, oy, rim, 0, TAU); g.fill();
    g.strokeStyle = `rgba(${ink},${(0.13 * ease(t / 0.6)).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.arc(ox, oy, rim, 0, TAU); g.stroke();
    const da = ease(t / 0.7);
    for (const d of dust) {
      proj(d[0], d[1], d[2], tmp, 0);
      g.fillStyle = `rgba(${ink},${((0.04 + 0.2 * front(tmp[2])) * da).toFixed(3)})`;
      g.fillRect(tmp[0] - 0.6, tmp[1] - 0.6, 1.2, 1.2);
    }

    // Where every entry is right now, and how bright it should be
    const lit = hover || (keys ? focus : null);
    if (active && now - activeAt > 2800) active = null;
    const n = nodes.length || 1;
    for (const nd of nodes) {
      nd.s = ease((t - (nd.i / n) * 0.45) / 0.55);
      const k = proj(nd.p[0] * nd.s, nd.p[1] * nd.s, nd.p[2] * nd.s, tmp, 0);
      nd.x = tmp[0]; nd.y = tmp[1]; nd.z = tmp[2];
      nd.r = (nd.big ? 4.3 : 3.1) * (0.72 + 0.5 * front(nd.z)) * k * (0.4 + 0.6 * nd.s);
      const want = lit ? (nd === lit || lit.links.has(nd) ? 1 : 0.24) : active ? (nd.cl === active ? 1 : 0.24) : 1;
      nd.dim += (want - nd.dim) * (reduced ? 1 : 0.18);
    }

    // Arcs, drawn in four depth bands so far ones are fainter
    const ea = ease((t - 0.4) / 0.6), bands = [[], [], [], []], hot = [];
    for (const e of edges) {
      const s = Math.min(e.a.s, e.b.s), pts = e.pts, scr = e.scr; let zsum = 0;
      for (let i = 0; i < pts.length; i++) { proj(pts[i][0] * s, pts[i][1] * s, pts[i][2] * s, scr, i * 3); zsum += scr[i * 3 + 2]; }
      e.dim = Math.min(e.a.dim, e.b.dim);
      const isHot = (lit && (e.a === lit || e.b === lit)) || (!lit && focus && (e.a === focus || e.b === focus));
      if (isHot) hot.push(e); else if (e.dim > 0.6) bands[Math.min(3, (front(zsum / pts.length) * 4) | 0)].push(e); else bands[0].push(e);
    }
    const path = list => { g.beginPath(); for (const e of list) { const s = e.scr; g.moveTo(s[0], s[1]); for (let i = 3; i < s.length; i += 3) g.lineTo(s[i], s[i + 1]); } g.stroke(); };
    g.lineWidth = 0.8;
    bands.forEach((list, b) => { if (!list.length) return; g.strokeStyle = `rgba(${ink},${((0.045 + 0.075 * b) * ea).toFixed(3)})`; path(list); });
    if (hot.length) { g.lineWidth = 1.2; g.strokeStyle = `rgba(${ink},${((lit ? 0.7 : 0.42) * ea).toFixed(3)})`; path(hot); }

    // Signals travelling along the arcs
    if (!reduced && t >= 1) {
      while (pulses.length < 3 && edges.length) pulses.push({ e: edges[(Math.random() * edges.length) | 0], t: 0, v: 0.007 + Math.random() * 0.007, rev: Math.random() < 0.5 });
      pulses = pulses.filter(pu => (pu.t += pu.v) < 1);
      for (const pu of pulses) {
        const s = pu.e.scr, last = s.length / 3 - 1;
        for (let j = 0; j < 4; j++) {
          const tt = Math.max(0, pu.t - j * 0.04), f = (pu.rev ? 1 - tt : tt) * last, i = Math.min(last - 1, f | 0), fr = f - i;
          const x = s[i * 3] + (s[i * 3 + 3] - s[i * 3]) * fr, y = s[i * 3 + 1] + (s[i * 3 + 4] - s[i * 3 + 1]) * fr, z = s[i * 3 + 2];
          g.fillStyle = `rgba(${ink},${((0.85 - j * 0.2) * (0.25 + 0.75 * front(z)) * pu.e.dim).toFixed(3)})`;
          g.beginPath(); g.arc(x, y, 2 - j * 0.32, 0, TAU); g.fill();
        }
      }
    }

    // Entries, far ones first
    const mark = lit || focus;
    for (const nd of nodes.slice().sort((a, b) => b.z - a.z)) {
      const f = front(nd.z), a = (0.2 + 0.8 * f) * nd.dim * clamp01(nd.s * 1.4);
      if (f > 0.5 && nd.dim > 0.6) { g.fillStyle = `rgba(${ink},${(0.07 * (f - 0.5) * 2).toFixed(3)})`; g.beginPath(); g.arc(nd.x, nd.y, nd.r * 2.7, 0, TAU); g.fill(); }
      g.fillStyle = `rgba(${ink},${a.toFixed(3)})`; g.beginPath(); g.arc(nd.x, nd.y, nd.r, 0, TAU); g.fill();
      if (nd === mark) { g.strokeStyle = `rgba(${ink},0.9)`; g.lineWidth = 1; g.beginPath(); g.arc(nd.x, nd.y, nd.r + 5 + (reduced ? 0 : Math.sin(frame / 9) * 1.1), 0, TAU); g.stroke(); }
    }

    // Section names float above their constellations when they face you
    labelBoxes = [];
    g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = rtl ? '600 11px "IBM Plex Sans Arabic", system-ui, sans-serif' : '600 10px Geist, system-ui, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = rtl ? '0px' : '0.9px';
    for (const cl of clusters) {
      proj(cl.c[0] * 1.02, cl.c[1] * 1.02, cl.c[2] * 1.02, tmp, 0);
      const vis = ease((-tmp[2] - 0.35) / 0.4) * ea * (active && active !== cl ? 0.3 : 1) * (lit && lit.cl !== cl ? 0.35 : 1);
      if (vis < 0.05) continue;
      const top = Math.min(...cl.nodes.map(nd => nd.y - nd.r)), w = g.measureText(cl.label).width;
      const x = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, tmp[0])), y = Math.max(10, top - 15);
      g.fillStyle = `rgba(${ink},${((active === cl ? 0.95 : 0.62) * vis).toFixed(3)})`;
      g.fillText(cl.label, x, y);
      labelBoxes.push({ cl, x: x - w / 2 - 6, y: y - 10, w: w + 12, h: 20 });
    }
    if ('letterSpacing' in g) g.letterSpacing = '0px';

    // The name of the entry in focus (when the pointer is not already showing one)
    if (focus && !hover) {
      const a = keys ? 1 : clamp01((now - focusAt) / 350) * clamp01((focusAt + 2700 - now) / 350);
      if (a > 0.01) {
        g.font = '500 12px Geist, "IBM Plex Sans Arabic", system-ui, sans-serif'; g.textAlign = 'left';
        const label = focus.it.title, w = g.measureText(label).width + 18, x = Math.min(W - w - 4, Math.max(4, focus.x + 11)), y = focus.y < 72 ? focus.y + 13 : focus.y - 31;
        g.globalAlpha = a;
        g.fillStyle = bg; g.strokeStyle = `rgba(${ink},0.2)`; g.lineWidth = 1;
        g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, 24, 12); else g.rect(x, y, w, 24); g.fill(); g.stroke();
        g.fillStyle = `rgba(${ink},1)`; g.fillText(label, x + 9, y + 12.5);
        g.globalAlpha = 1;
      }
    }
  }

  function tick(now) {
    frame++;
    const shown = visible && !document.hidden && host.offsetParent !== null;
    if (shown) {
      if (!born && seen) born = now;
      if (!born) { requestAnimationFrame(tick); return; }
      if (glide) {
        let dy = glide.yaw - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw += dy * 0.12; pitch += (glide.pitch - pitch) * 0.12;
        if (Math.abs(dy) < 0.003 && Math.abs(glide.pitch - pitch) < 0.003) glide = null;
      } else if (!drag) {
        yaw += vel; vel *= 0.94;
        if (!reduced && !hover && !keys && !active) yaw += 0.0015;
      }
      if (keys) focus = frontNode();
      else if (!reduced && !hover && !drag && !active && now - born > 1900 && now - focusAt > 3400) {
        const cands = nodes.filter(nd => nd.z < -0.25 && nd !== focus);
        if (cands.length) { focus = cands[(Math.random() * cands.length) | 0]; focusAt = now; burst(focus); }
      }
      draw(now);
    }
    requestAnimationFrame(tick);
  }

  function at(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function pick(e) {
    const [mx, my] = at(e); let best = null, bd = coarse ? 22 : 15;
    for (const nd of nodes) { if (nd.z > 0.15) continue; const d = Math.hypot(nd.x - mx, nd.y - my); if (d < bd) { bd = d; best = nd; } } // only entries on the near side
    return best;
  }
  function pickLabel(e) { const [mx, my] = at(e); const b = labelBoxes.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h); return b ? b.cl : null; }
  function showTip(nd) {
    if (!nd) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${APP.esc(nd.it.title)}</b><span>${APP.esc([nd.it.role || APP.kind(nd.it), nd.it.status].filter(Boolean).join(' · '))}</span>`;
    tip.hidden = false;
    tip.style.left = Math.min(W - tip.offsetWidth - 4, Math.max(4, nd.x + 13)) + 'px';
    tip.style.top = Math.max(4, nd.y - tip.offsetHeight - 11) + 'px';
  }
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; glide = null; cv.style.cursor = 'grabbing'; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.008; vel = dx * 0.0015; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.006));
      if (drag.moved > 5) { hover = null; showTip(null); }
      return;
    }
    if (e.pointerType === 'touch') return;
    const nd = pick(e);
    if (nd !== hover) { hover = nd; showTip(nd); if (nd) burst(nd); }
    cv.style.cursor = nd || pickLabel(e) ? 'pointer' : 'grab';
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return;
    const click = drag.moved < 6; drag = null; cv.style.cursor = 'grab';
    if (!click) return;
    const nd = pick(e);
    if (nd) { APP.openItem(nd.it.id); return; }
    const cl = pickLabel(e);
    if (cl) { active = cl; activeAt = performance.now(); glide = aim(cl.c); vel = 0; }
  });
  cv.addEventListener('pointercancel', () => { drag = null; cv.style.cursor = 'grab'; });
  cv.addEventListener('pointerleave', () => { if (!drag) { hover = null; showTip(null); } });
  host.addEventListener('keydown', e => {
    const step = { ArrowLeft: [0.35, 0], ArrowRight: [-0.35, 0], ArrowUp: [0, 0.25], ArrowDown: [0, -0.25] }[e.key];
    if (step) { e.preventDefault(); keys = true; glide = { yaw: (glide ? glide.yaw : yaw) + step[0], pitch: Math.max(-1.1, Math.min(1.1, (glide ? glide.pitch : pitch) + step[1])) }; }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const nd = frontNode(); if (nd) APP.openItem(nd.it.id); }
  });
  host.addEventListener('focus', () => { keys = host.matches(':focus-visible'); });
  host.addEventListener('blur', () => { keys = false; });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (en.intersectionRatio >= 0.33 && APP.loaded) seen = true; }, { threshold: [0, 0.33, 0.66] }).observe(host);
  APP.onProfile.push(() => requestAnimationFrame(() => { const r = host.getBoundingClientRect(); if (r.height && Math.min(innerHeight, r.bottom) - Math.max(0, r.top) >= r.height * 0.33) seen = true; }));
  document.addEventListener('portfolio:theme', colors);
  APP.onProfile.push(build);
  colors(); resize(); build();
  requestAnimationFrame(tick);
})();
