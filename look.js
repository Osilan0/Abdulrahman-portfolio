/* Behaviour for the "AI look" (see look.css). It does nothing when the page uses the classic design.
   1. Answers appear word by word, then their sources and next questions follow.
   2. On the home page, the question box types out example questions until you click it. */
(function () {
  const APP = window.APP, root = document.documentElement;
  if (!APP || root.dataset.look !== 'ai') return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const thread = $('#thread'), q = $('#q'), main = $('#main');

  // 1. Word-by-word answers. chat.js marks an answer that arrived all at once with the class "fade";
  //    answers that were already streamed live are left alone.
  function reveal(txt, body) {
    if (reduced || !txt || !txt.classList.contains('fade') || txt.dataset.revealed) return;
    txt.dataset.revealed = '1';
    const texts = [], walker = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode);
    let i = 0;
    for (const node of texts) {
      const parts = node.nodeValue.split(/(\s+)/);
      if (parts.length < 2 && !parts[0].trim()) continue;
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); continue; }
        const w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = part;
        frag.appendChild(w);
      }
      node.parentNode.replaceChild(frag, node);
    }
    // The whole answer lands in about a second and a half at most, however long it is.
    const step = Math.max(6, Math.min(26, 1500 / Math.max(1, i)));
    txt.style.setProperty('--step', step + 'ms');
    body.style.setProperty('--after', Math.round(i * step + 150) + 'ms');
  }
  if (thread) new MutationObserver(list => {
    for (const m of list) m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList.contains('meta-row')) reveal(n.parentElement.querySelector('.txt'), n.parentElement);
    });
  }).observe(thread, { childList: true, subtree: true });

  // 2. The typing placeholder. It stops as soon as the visitor focuses the box or leaves the home page.
  let base = '', timer = 0, running = false;
  const idle = () => main.classList.contains('home') && !q.value && document.activeElement !== q && !document.hidden;
  const stop = () => { clearTimeout(timer); if (running && base) q.placeholder = base; running = false; };
  function start(delay) {
    stop();
    const list = (APP.P.suggested || []).map(x => x.q).filter(Boolean);
    if (reduced || !list.length) return;
    timer = setTimeout(() => {
      if (!idle()) return;
      base = q.placeholder; running = true;
      let n = 0;
      const next = () => {
        const chars = Array.from(list[n++ % list.length]); let k = 0;
        const type = () => {
          if (!idle()) return stop();
          q.placeholder = chars.slice(0, ++k).join('');
          if (k < chars.length) timer = setTimeout(type, 38 + Math.random() * 40);
          else timer = setTimeout(erase, 1900);
        };
        const erase = () => {
          if (!idle()) return stop();
          k = Math.max(0, k - 3); q.placeholder = chars.slice(0, k).join('') || base;
          timer = setTimeout(k ? erase : next, k ? 16 : 700);
        };
        type();
      };
      next();
    }, delay);
  }
  q.addEventListener('focus', stop);
  q.addEventListener('input', stop);
  q.addEventListener('blur', () => start(2600));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start(1500)));
  new MutationObserver(() => (main.classList.contains('home') ? (running || start(1800)) : stop())).observe(main, { attributes: true, attributeFilter: ['class'] });
  APP.onProfile.push(() => start(2200));
  if (APP.loaded) start(2200);
})();
