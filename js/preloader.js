/* Linden Row – preloader + image placeholders (plain JS, no dependencies) */
(() => {
  /* image placeholders: fade each image in once it has loaded */
  const settle = (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    const box = t.closest('.card-img, .cat-card, .arch, .pre-slot');
    if (e.type === 'error') { t.style.visibility = 'hidden'; if (box && !box.classList.contains('pre-slot')) box.classList.add('ph-broken'); return; }
    t.classList.add('loaded');
    if (box) box.classList.add('ph-done');
  };
  document.addEventListener('load', settle, true);
  document.addEventListener('error', settle, true);
  /* the logo in the preloader may have finished (or failed) before this script ran */
  document.querySelectorAll('#preloader img').forEach(i => { if (i.complete) settle({ target: i, type: i.naturalWidth ? 'load' : 'error' }); });

  /* preloader */
  const pre = document.getElementById('preloader');
  if (!pre) { window.__lrRevealed = true; return; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = pre.querySelector('.pre-count b'), bar = pre.querySelector('.pre-bar i');

  /* ---- timing (lower = faster) ---- */
  const MIN = reduce ? 150 : 700;     /* shortest time the preloader is shown (was 2000) */
  const MAX = 3500;                   /* hard limit, never wait longer than this (was 9000) */
  const HERO_WAIT = 1200;             /* max wait for hero images (was 2500) */
  const FONT_WAIT = 1000;             /* max wait for fonts (was 3000) */
  const EASE = 0.18;                  /* counter speed (was 0.08) */

  const t0 = performance.now();
  let ready = false, shown = 0, finished = false;
  document.body.classList.add('is-loading');

  const heroImages = () => [...document.querySelectorAll('#heroArches img')].map(i => i.complete ? 1 :
    new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }));
  const cap = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);

  /* main.js fires lr:data once the catalog has rendered (or failed) */
  document.addEventListener('lr:data', () => {
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([cap(Promise.all(heroImages()), HERO_WAIT), cap(fonts, FONT_WAIT)]).then(() => { ready = true; });
  }, { once: true });

  const finish = () => {
    if (finished) return; finished = true;
    num.textContent = 100; bar.style.transform = 'scaleX(1)';
    setTimeout(() => pre.classList.add('done'), reduce ? 0 : 100);
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      window.__lrRevealed = true;
      document.dispatchEvent(new Event('lr:revealed'));
    }, reduce ? 0 : 450);
    setTimeout(() => pre.remove(), 1400);
  };

  const tick = () => {
    const el = performance.now() - t0;
    const target = ready && el >= MIN ? 100 : Math.min(88, (el / MIN) * 88);
    shown += (target - shown) * EASE;
    if (target === 100 && shown > 99.4) shown = 100;
    num.textContent = Math.round(shown);
    bar.style.transform = 'scaleX(' + shown / 100 + ')';
    if (shown >= 100 || el > MAX) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();