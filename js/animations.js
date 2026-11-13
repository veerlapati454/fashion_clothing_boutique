/* Linden Row – GSAP + ScrollTrigger animations (AOS is initialised in main.js) */
(() => {
  const noop = () => {};
  window.Anim = { hero: noop, cats: noop, reveal: noop, refresh: noop, drawer: noop, modal: noop, fly: noop, pop: noop, bump: noop };
  if (!window.gsap || !window.ScrollTrigger) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const canHover = matchMedia('(hover:hover)').matches;
  const whenRevealed = (fn) => window.__lrRevealed ? fn() : document.addEventListener('lr:revealed', fn, { once: true });
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

  /* split text into words (mask = clipped line-reveal, else plain spans) */
  const splitWords = (el, mask) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(w => mask
      ? `<span class="sw" aria-hidden="true"><span>${esc(w)}</span></span>`
      : `<span class="qw" aria-hidden="true">${esc(w)}</span>`).join(' ');
    return $$(mask ? '.sw > span' : '.qw', el);
  };

  /* ---------- page chrome ---------- */
  const bar = document.createElement('div');
  bar.className = 'progress'; document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  ScrollTrigger.create({ start: 80, end: 'max', toggleClass: { targets: '.header', className: 'scrolled' } });

  /* ---------- intro timeline ---------- */
  const words = splitWords($('.hero h1'), true);
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } })
    .from('.header', { yPercent: -100, duration: 0.8, clearProps: 'transform' }, 0)
    .from('.logo, .nav a, .actions .icon-btn', { y: -18, autoAlpha: 0, stagger: 0.06, duration: 0.6 }, 0.25)
    .from(words, { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.09 }, 0.3)
    .from('.hero p', { y: 30, autoAlpha: 0, duration: 0.9 }, 0.9)
    .from('.hero-cta .btn', { y: 30, autoAlpha: 0, stagger: 0.12, duration: 0.8 }, 1.05)
    .from('.badge', { scale: 0, rotate: -200, duration: 1.4, ease: 'back.out(1.6)' }, 0.8);
  whenRevealed(() => intro.play());
  gsap.to('.badge svg', { rotation: 360, duration: 18, ease: 'none', repeat: -1 });

  /* hero orbs, scroll parallax */
  const hero = $('.hero');
  ['o1', 'o2', 'o3'].forEach(c => { const o = document.createElement('span'); o.className = 'orb ' + c; hero.prepend(o); });
  $$('.hero .orb').forEach(o => gsap.to(o, { x: 'random(-70,70)', y: 'random(-50,50)', duration: 'random(5,8)', ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true }));
  /* scroll parallax: anchored to the very top of the page so scrollY = 0 always means "untouched" */
  const heroST = (copy) => ({
    start: 0, end: () => hero.offsetTop + hero.offsetHeight, scrub: 0.5, invalidateOnRefresh: true,
    onLeaveBack: () => gsap.set(copy, { clearProps: 'opacity,visibility,transform' })
  });
  gsap.fromTo('.hero-copy', { yPercent: 0, opacity: 1 }, { yPercent: -10, opacity: 0.4, ease: 'none', immediateRender: false, scrollTrigger: heroST('.hero-copy') });
  gsap.fromTo('.arches', { yPercent: 0 }, { yPercent: 8, ease: 'none', immediateRender: false, scrollTrigger: heroST('.arches') });

  /* ---------- marquee that speeds up while scrolling ---------- */
  const track = $('.marquee-track');
  if (track) {
    track.innerHTML = track.innerHTML.repeat(4);
    const loop = gsap.to(track, { xPercent: -25, duration: 24, ease: 'none', repeat: -1 });
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 200, 7), duration: 0.3, overwrite: true }) });
    ScrollTrigger.addEventListener('scrollEnd', () => gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true }));
  }

  /* ---------- section headings ---------- */
  $$('.head h2, .news h2').forEach(h => {
    gsap.from(splitWords(h, true), { yPercent: 115, rotate: 4, duration: 1, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  /* ---------- testimonials: words light up as you scroll ---------- */
  $$('.quote').forEach(q => {
    gsap.fromTo(splitWords($('blockquote', q)), { opacity: 0.15 }, { opacity: 1, stagger: 0.06, ease: 'none', scrollTrigger: { trigger: q, start: 'top 85%', end: 'bottom 55%', scrub: true } });
  });
  gsap.from('.av', { scale: 0, rotate: -120, duration: 0.9, ease: 'back.out(2)', stagger: 0.18, scrollTrigger: { trigger: '.quotes', start: 'top 75%', once: true } });

  /* ---------- newsletter orbs ---------- */
  const news = $('.news');
  ['o1', 'o2'].forEach(c => { const o = document.createElement('span'); o.className = 'orb ' + c; news.prepend(o); gsap.to(o, { x: 'random(-50,50)', y: 'random(-40,40)', duration: 'random(4,7)', ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true }); });

  /* ---------- magnetic buttons ---------- */
  if (canHover) $$('.hero-cta .btn, .news .btn, #moreBtn').forEach(b => {
    b.classList.add('mag');
    const xt = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
    const yt = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
    b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); xt((e.clientX - r.left - r.width / 2) * 0.35); yt((e.clientY - r.top - r.height / 2) * 0.5); });
    b.addEventListener('mouseleave', () => { xt(0); yt(0); });
  });

  /* hero mouse parallax */
  if (canHover) hero.addEventListener('mousemove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    $$('.arch img').forEach((img, i) => gsap.to(img, { x: nx * -18 * (i + 1), y: ny * -10 * (i + 1), duration: 0.9, overwrite: 'auto' }));
    gsap.to('.orb', { xPercent: nx * 20, yPercent: ny * 20, duration: 1.4, overwrite: 'auto' });
  });

  /* ---------- hooks used by main.js ---------- */
  const triggers = new Map();
  let rt;
  Object.assign(window.Anim, {
    hero() {
      const arches = $$('.arch');
      gsap.set(arches, { yPercent: 110, autoAlpha: 0 });
      whenRevealed(() => gsap.to(arches, {
        yPercent: 0, autoAlpha: 1, duration: 1.3, stagger: 0.15, delay: 0.4, ease: 'power4.out',
        onComplete: () => arches.forEach((a, i) => gsap.to(a, { y: -16, duration: 2.4 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
      }));
    },
    cats() {
      $$('.cat-card').forEach(card => {
        const img = $('img', card);
        gsap.set(img, { transformOrigin: '50% 60%' });
        if (canHover) {
          const xTo = gsap.quickTo(img, 'x', { duration: 0.6, ease: 'power3' });
          const yTo = gsap.quickTo(img, 'y', { duration: 0.6, ease: 'power3' });
          const rTo = gsap.quickTo(img, 'rotation', { duration: 0.6, ease: 'power3' });
          card.addEventListener('mousemove', (e) => { const r = card.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5; xTo(nx * 28); yTo(ny * 20); rTo(nx * 5); });
          card.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.1, duration: 0.6, ease: 'power3.out' }));
          card.addEventListener('mouseleave', () => { xTo(0); yTo(0); rTo(0); gsap.to(img, { scale: 1, duration: 0.6, ease: 'power3.out' }); });
        }
        gsap.from(img, { yPercent: 12, scale: 1.15, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      this.refresh();
    },
    reveal(container, from = 0) {
      (triggers.get(container) || []).forEach(t => t.kill());
      const cards = $$('.card', container).slice(from);
      if (!cards.length) return;
      cards.forEach(c => { c.style.transition = 'none'; });
      gsap.set(cards, { autoAlpha: 0, y: 70, rotate: 2, scale: 0.94 });
      triggers.set(container, ScrollTrigger.batch(cards, {
        start: 'top 92%', once: true,
        onEnter: (batch) => gsap.to(batch, {
          autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 0.9, stagger: 0.09, ease: 'back.out(1.3)',
          onComplete: () => batch.forEach(c => { c.style.transition = ''; gsap.set(c, { clearProps: 'all' }); })
        })
      }));
      this.refresh();
    },
    refresh() { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 150); },
    drawer() { gsap.from('#drawer .line, #drawer .d-foot', { x: 40, autoAlpha: 0, stagger: 0.07, duration: 0.55, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }); },
    modal() { gsap.from('#modal .m-gallery, #modal .m-info > *, #modal .confirm > *', { y: 26, autoAlpha: 0, stagger: 0.06, duration: 0.55, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }); },
    bump(el) { gsap.fromTo(el, { scale: 1.9 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }); },
    pop(el) { const s = $('svg', el); if (s) gsap.fromTo(s, { scale: 0.4, rotate: -25 }, { scale: 1, rotate: 0, duration: 0.8, ease: 'elastic.out(1.2,0.4)' }); },
    fly(btn) {
      const src = btn.closest('.card, .m-box'), img = src && $('img', src), target = $('#cartBtn');
      if (!img || !target) return;
      const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
      const c = img.cloneNode();
      Object.assign(c.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', zIndex: 300, pointerEvents: 'none', objectFit: 'contain', borderRadius: '14px', background: '#f7f3f5', padding: 0 });
      document.body.appendChild(c);
      const size = 36, tx = b.left + b.width / 2 - size / 2, ty = b.top + b.height / 2 - size / 2;
      gsap.to(c, { left: tx, width: size, height: size, opacity: 0.5, duration: 0.9, ease: 'power2.inOut' });
      gsap.to(c, { top: ty, duration: 0.9, ease: 'back.in(1.5)', onComplete: () => { c.remove(); gsap.fromTo(target, { scale: 1.3 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1,0.4)' }); } });
    }
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
  whenRevealed(() => ScrollTrigger.refresh());
})();