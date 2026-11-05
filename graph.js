/* Knowledge sphere: every portfolio entry is a node on a slowly rotating sphere.
   Sections form latitude rings; lines join entries in the same section or sharing a tag.
   Drag to rotate, hover for a label, click to open the entry. Monochrome, theme-aware. */
(function () {
  const APP = window.APP, C = window.PortfolioCore;
  const host = document.getElementById('sphere');
  if (!host) return;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  const tip = document.createElement('div');
  tip.className = 'sph-tip'; tip.hidden = true;
  host.append(cv, tip);
  const g = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 1, H = 1, R = 1, dpr = 1, yaw = 0.7, pitch = -0.32, vel = 0, drag = null, hover = null;
  let nodes = [], dust = [], edges = [], focus = null, focusAt = 0, ink = '10,10,10', bg = '#ffffff', frame = 0, visible = true, raf = 0;

  const fib = (n, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5)); return [Math.cos(th) * r, y, Math.sin(th) * r]; };
  function build() {
    const items = C.allItems(APP.P);
    nodes = items.map((it, i) => ({ it, p: fib(items.length, i), x: 0, y: 0, z: 0, k: 1 }));
    dust = Array.from({ length: 240 }, (_, i) => fib(240, i).map(v => v * 0.985));
    edges = [];
    const bySec = {};
    nodes.forEach((n, i) => (bySec[n.it.section] = bySec[n.it.section] || []).push(i));
    Object.values(bySec).forEach(l => l.forEach((a, j) => { if (j) edges.push([l[j - 1], a]); }));
    for (let a = 0; a < nodes.length; a++) {
      const ta = new Set(nodes[a].it.tags.map(t => t.toLowerCase()));
      for (let b = a + 1; b < nodes.length; b++)
        if (nodes[a].it.section !== nodes[b].it.section && nodes[b].it.tags.some(t => ta.has(t.toLowerCase()))) edges.push([a, b]);
    }
    const cap = host.parentElement.querySelector('.sph-cap');
    if (cap) cap.textContent = `${items.length} entries · drag to rotate · click to open`;
  }
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const hex = (cs.getPropertyValue('--ink') || '#0a0a0a').trim();
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    ink = m ? [1, 2, 3].map(i => parseInt(m[i], 16)).join(',') : '10,10,10';
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
  function project(p) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
    const k = 3.4 / (3.4 + z2);
    return [W / 2 + x1 * R * k, H / 2 + y2 * R * k, z2, k];
  }
  const front = z => (1 - z) / 2;
  function draw() {
    g.clearRect(0, 0, W, H);
    for (const d of dust) {
      const [x, y, z, k] = project(d);
      g.fillStyle = `rgba(${ink},${(0.05 + 0.22 * front(z)).toFixed(3)})`;
      const s = 1.3 * k; g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    for (const n of nodes) { const [x, y, z, k] = project(n.p); n.x = x; n.y = y; n.z = z; n.k = k; }
    const lit = hover || focus;
    for (const [a, b] of edges) {
      const A = nodes[a], B = nodes[b], on = lit && (A === lit || B === lit);
      g.strokeStyle = `rgba(${ink},${on ? 0.55 : (0.04 + 0.14 * front((A.z + B.z) / 2)).toFixed(3)})`;
      g.lineWidth = on ? 1.2 : 0.8;
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
    }
    const order = nodes.slice().sort((a, b) => b.z - a.z);
    for (const n of order) {
      const f = front(n.z), r = (2.4 + 1.6 * f) * n.k;
      g.fillStyle = `rgba(${ink},${(0.25 + 0.75 * f).toFixed(3)})`;
      g.beginPath(); g.arc(n.x, n.y, r, 0, 6.2832); g.fill();
      if (n === lit) {
        g.strokeStyle = `rgba(${ink},0.9)`; g.lineWidth = 1;
        g.beginPath(); g.arc(n.x, n.y, r + 5 + (reduced ? 0 : Math.sin(frame / 9) * 1.2), 0, 6.2832); g.stroke();
      }
    }
    if (focus && !hover) {
      const a = Math.min(1, (performance.now() - focusAt) / 400) * Math.min(1, (focusAt + 2600 - performance.now()) / 400);
      if (a > 0) {
        g.font = '500 12px Geist, system-ui, sans-serif';
        const label = focus.it.title, w = g.measureText(label).width + 16, x = Math.min(W - w - 4, Math.max(4, focus.x + 10)), y = Math.max(4, focus.y - 30);
        g.globalAlpha = a;
        g.fillStyle = bg; g.strokeStyle = `rgba(${ink},0.18)`;
        g.beginPath(); g.roundRect ? g.roundRect(x, y, w, 24, 12) : g.rect(x, y, w, 24); g.fill(); g.stroke();
        g.fillStyle = `rgba(${ink},1)`; g.textBaseline = 'middle'; g.fillText(label, x + 8, y + 12);
        g.globalAlpha = 1;
      }
    }
  }
  function tick() {
    frame++;
    if (frame % 90 === 1) colors();
    const shown = visible && host.offsetParent !== null;
    if (shown) {
      if (!drag) { yaw += vel; vel *= 0.94; if (!reduced && !hover) yaw += 0.0016; }
      if (!reduced && performance.now() - focusAt > 3000) {
        const cands = nodes.filter(n => n.z < -0.2);
        if (cands.length) { focus = cands[Math.floor(Math.random() * cands.length)]; focusAt = performance.now(); }
      }
      draw();
    }
    raf = requestAnimationFrame(tick);
  }
  function pick(e) {
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 14;
    for (const n of nodes) { if (n.z > 0.55) continue; const d = Math.hypot(n.x - mx, n.y - my); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function showTip(n) {
    if (!n) { tip.hidden = true; cv.style.cursor = drag ? 'grabbing' : 'grab'; return; }
    tip.innerHTML = `<b>${APP.esc(n.it.title)}</b><span>${APP.esc([APP.kind(n.it), n.it.status].filter(Boolean).join(' · '))}</span>`;
    tip.hidden = false;
    tip.style.left = Math.min(W - tip.offsetWidth - 4, Math.max(4, n.x + 12)) + 'px';
    tip.style.top = Math.max(4, n.y - tip.offsetHeight - 10) + 'px';
    cv.style.cursor = 'pointer';
  }
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.008; vel = dx * 0.0015; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.006));
      hover = null; showTip(null); return;
    }
    hover = pick(e); showTip(hover);
  });
  const end = e => { if (!drag) return; const click = drag.moved < 5; drag = null; if (click) { const n = pick(e); if (n) APP.openItem(n.it.id); } };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { drag = null; });
  cv.addEventListener('pointerleave', () => { if (!drag) { hover = null; showTip(null); } });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);
  APP.onProfile.push(build);
  colors(); resize(); build();
  raf = requestAnimationFrame(tick);
})();
