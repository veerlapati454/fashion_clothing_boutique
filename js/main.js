/* Linden Row – page logic */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const label = (slug) => (CATEGORIES.find(c => c.slug === slug) || {}).label || slug;
  const stars = (r) => { const n = Math.round(r); return `<span class="stars" role="img" aria-label="Rated ${r.toFixed(1)} out of 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}<small>${r.toFixed(1)}</small></span>`; };

  const S = { all: [], pool: [], byId: new Map(), cat: 'all', q: '', sort: 'default', shown: 8, step: 8 };
  const SLUGS = new Set(CATEGORIES.map(c => c.slug));

  /* ---------- templates ---------- */
  const card = (p) => `
    <article class="card">
      <div class="card-img">
        <img src="${p.thumbnail}" alt="${esc(p.title)}" loading="lazy" width="300" height="300">
        ${p.discountPercentage >= 10 ? `<span class="tag">-${Math.round(p.discountPercentage)}%</span>` : ''}
        <button class="wish ${Store.isWished(p.id) ? 'on' : ''}" data-act="wish" data-id="${p.id}" aria-label="Toggle wishlist for ${esc(p.title)}">${ic('heart')}</button>
        <button class="quick" data-act="view" data-id="${p.id}">Quick view</button>
      </div>
      <div class="card-body">
        <p class="cat">${label(p.category)}</p>
        <h3>${esc(p.title)}</h3>
        <div class="meta">${stars(p.rating)}<b>${money(p.price)}</b></div>
        <button class="btn btn-dark btn-sm" data-act="add" data-id="${p.id}">Add to bag</button>
      </div>
    </article>`;

  const skeletons = (n) => Array.from({ length: n }, () => `<div class="card"><div class="card-img skeleton"></div><div class="card-body"><div class="sk-line skeleton"></div><div class="sk-line short skeleton"></div></div></div>`).join('');

  const errorBox = (msg) => `<div class="error"><p><b>Something went wrong.</b> ${esc(msg)}</p><button class="btn btn-dark btn-sm" data-act="retry">Try again</button></div>`;

  /* ---------- toast ---------- */
  let toastT;
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- counts ---------- */
  const updateCounts = () => {
    const c = Store.totals().count, w = Store.wish.length;
    if (+$('#cartCount').textContent !== c) Anim.bump($('#cartCount'));
    if (+$('#wishCount').textContent !== w) Anim.bump($('#wishCount'));
    $('#cartCount').textContent = c;
    $('#wishCount').textContent = w;
    $$('.wish').forEach(b => b.classList.toggle('on', Store.isWished(+b.dataset.id)));
  };

  /* ---------- data loading ---------- */
  async function loadCatalog() {
    $('#grid').innerHTML = skeletons(8);
    $('#newRail').innerHTML = skeletons(5);
    $('#catGrid').innerHTML = CATEGORIES.slice(0, 6).map(() => '<div class="cat-card skeleton"></div>').join('');
    try {
      const lists = await Promise.all(CATEGORIES.map(c => Api.byCategory(c.slug)));
      S.all = lists.flat();
      S.byId = new Map(S.all.map(p => [p.id, p]));
      S.pool = S.all;
      renderCategories(lists);
      renderNew(lists);
      renderHero(lists);
      renderChips();
      renderGrid();
    } catch (e) {
      const msg = e.message || 'Please check your connection.';
      $('#grid').innerHTML = errorBox(msg);
      $('#newRail').innerHTML = errorBox(msg);
      $('#catGrid').innerHTML = errorBox(msg);
    } finally {
      document.dispatchEvent(new Event('lr:data'));
    }
  }

  function renderHero(lists) {
    const pick = [lists[0][0], lists[4][0], lists[2][0]].filter(Boolean);
    $('#heroArches').innerHTML = pick.map((p, i) =>
      `<div class="arch a${i + 1}"><img src="${p.thumbnail}" alt="" width="300" height="300"></div>`).join('');
    Anim.hero();
  }

  function renderCategories(lists) {
    $('#catGrid').innerHTML = CATEGORIES.slice(0, 6).map((c, i) => `
      <button class="cat-card t${i % 3}" data-act="cat" data-slug="${c.slug}" data-aos="fade-up" data-aos-delay="${(i % 3) * 100}">
        <img src="${lists[i][0].thumbnail}" alt="" loading="lazy" width="300" height="300">
        <span class="cat-label"><b>${c.label}</b><small>${lists[i].length} pieces</small></span>
      </button>`).join('');
    refreshAOS(); Anim.cats();
  }

  function renderNew(lists) {
    const items = lists.map(l => l[l.length - 1]);
    $('#newRail').innerHTML = items.map(p => card(p).replace('<div class="card-img">', '<div class="card-img"><span class="tag new">New</span>')).join('');
    Anim.reveal($('#newRail'));
  }

  function renderChips() {
    const all = [{ slug: 'all', label: 'All' }, ...CATEGORIES];
    $('#chips').innerHTML = all.map(c =>
      `<button class="chip ${S.cat === c.slug ? 'on' : ''}" data-act="chip" data-slug="${c.slug}" aria-pressed="${S.cat === c.slug}">${c.label}</button>`).join('');
  }

  /* ---------- filtering / sorting / rendering grid ---------- */
  function view() {
    let list = S.pool.filter(p => SLUGS.has(p.category));
    if (S.cat !== 'all') list = list.filter(p => p.category === S.cat);
    if (S.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (S.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (S.sort === 'rating-desc') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }

  function renderGrid(from = 0) {
    const list = view();
    const grid = $('#grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty"><p><b>No matches found.</b> Try a different name or clear the category filter.</p><button class="btn btn-dark btn-sm" data-act="reset">Clear filters</button></div>`;
      $('#moreBtn').hidden = true; $('#resultCount').textContent = '0 products';
      return;
    }
    grid.innerHTML = list.slice(0, S.shown).map(card).join('');
    $('#resultCount').textContent = `Showing ${Math.min(S.shown, list.length)} of ${list.length} products`;
    $('#moreBtn').hidden = S.shown >= list.length;
    Anim.reveal(grid, from);
  }

  let searchT, searchId = 0;
  async function runSearch(q) {
    S.q = q.trim(); S.shown = S.step;
    const id = ++searchId;
    if (!S.q) { S.pool = S.all; renderGrid(); return; }
    $('#grid').innerHTML = skeletons(4);
    try {
      const res = await Api.search(S.q);
      if (id !== searchId) return;
      S.pool = res; renderGrid();
    } catch (e) { if (id === searchId) $('#grid').innerHTML = errorBox(e.message); }
  }

  /* ---------- drawer (bag / wishlist) ---------- */
  let drawerView = 'cart', couponMsg = null;
  function openDrawer(v) { drawerView = v; renderDrawer(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); showScrim(true); Anim.drawer(); }
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); if (!$('#modal').hidden === false) showScrim(false); }
  function showScrim(on) { $('#scrim').hidden = !on; document.body.classList.toggle('lock', on); }

  function renderDrawer() {
    const d = $('#drawer');
    if (drawerView === 'wish') {
      d.innerHTML = `<div class="d-head"><h2>Wishlist</h2><button class="icon-btn" data-act="close" aria-label="Close">${ic('close')}</button></div>
        <div class="d-body">${Store.wish.length ? Store.wish.map(p => `
          <div class="line"><img src="${p.thumbnail}" alt="" width="64" height="64">
            <div><h4>${esc(p.title)}</h4><p>${money(p.price)}</p>
              <div class="line-actions"><button class="link" data-act="move" data-id="${p.id}">Move to bag</button><button class="link" data-act="wish-rm" data-id="${p.id}">Remove</button></div></div></div>`).join('')
          : '<p class="empty-note">Nothing saved yet. Tap the heart on any product to keep it here.</p>'}</div>`;
      return;
    }
    const t = Store.totals();
    d.innerHTML = `<div class="d-head"><h2>Your bag (${t.count})</h2><button class="icon-btn" data-act="close" aria-label="Close">${ic('close')}</button></div>
      <div class="d-body">${Store.cart.length ? Store.cart.map(i => `
        <div class="line"><img src="${i.thumbnail}" alt="" width="64" height="64">
          <div><h4>${esc(i.title)}</h4><p>${money(i.price)}</p>
            <div class="line-actions">
              <div class="qty"><button data-act="dec" data-id="${i.id}" aria-label="Decrease quantity">−</button><span>${i.qty}</span><button data-act="inc" data-id="${i.id}" aria-label="Increase quantity">+</button></div>
              <button class="link" data-act="rm" data-id="${i.id}">Remove</button></div></div>
          <b>${money(i.price * i.qty)}</b></div>`).join('')
        : '<p class="empty-note">Your bag is empty. Add something you love from the trending list.</p>'}</div>
      ${Store.cart.length ? `<div class="d-foot">
        <form class="coupon" id="couponForm"><input id="couponInput" placeholder="Coupon code" value="${Store.coupon || ''}" aria-label="Coupon code"><button class="btn btn-dark btn-sm" type="submit">Apply</button></form>
        ${couponMsg ? `<p class="form-msg ${couponMsg.ok ? 'ok' : 'bad'}">${esc(couponMsg.msg)}</p>` : ''}
        <dl class="sum"><div><dt>Subtotal</dt><dd>${money(t.sub)}</dd></div>
          ${t.discount ? `<div><dt>Discount (${Store.coupon})</dt><dd>−${money(t.discount)}</dd></div>` : ''}
          <div><dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : 'Free'}</dd></div>
          <div class="total"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl>
        <button class="btn btn-dark block" data-act="checkout">Place order</button></div>` : ''}`;
  }

  /* ---------- modal ---------- */
  function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="m-box"><button class="icon-btn m-close" data-act="mclose" aria-label="Close">${ic('close')}</button>${html}</div>`; m.hidden = false; showScrim(true); $('.m-close', m).focus(); Anim.modal(); }
  function closeModal() { $('#modal').hidden = true; if (!$('#drawer').classList.contains('open')) showScrim(false); }

  async function showProduct(id) {
    let p = S.byId.get(id);
    openModal('<div class="m-loading skeleton"></div>');
    try { p = { ...p, ...(await Api.one(id)) }; } catch (e) { if (!p) { $('.m-box').insertAdjacentHTML('beforeend', errorBox(e.message)); return; } }
    const imgs = (p.images && p.images.length ? p.images : [p.thumbnail]);
    $('#modal .m-box').innerHTML = `<button class="icon-btn m-close" data-act="mclose" aria-label="Close">${ic('close')}</button>
      <div class="m-grid">
        <div class="m-gallery"><img class="m-main" id="mMain" src="${imgs[0]}" alt="${esc(p.title)}">
          <div class="m-thumbs">${imgs.slice(0, 4).map(s => `<button data-act="thumb" data-src="${s}" aria-label="Show image"><img src="${s}" alt=""></button>`).join('')}</div></div>
        <div class="m-info">
          <p class="cat">${label(p.category)}${p.brand ? ' · ' + esc(p.brand) : ''}</p>
          <h2>${esc(p.title)}</h2>
          <div class="meta">${stars(p.rating)}<b class="price">${money(p.price)}</b></div>
          <p class="desc">${esc(p.description || '')}</p>
          <ul class="facts"><li>${p.stock > 0 ? (p.stock < 10 ? 'Only ' + p.stock + ' left' : 'In stock') : 'Sold out'}</li>${p.shippingInformation ? `<li>${esc(p.shippingInformation)}</li>` : ''}${p.returnPolicy ? `<li>${esc(p.returnPolicy)}</li>` : ''}</ul>
          ${p.reviews && p.reviews[0] ? `<p class="rev">“${esc(p.reviews[0].comment)}” <small>– ${esc(p.reviews[0].reviewerName)}</small></p>` : ''}
          <div class="m-actions"><button class="btn btn-dark" data-act="add" data-id="${p.id}">Add to bag</button>
            <button class="btn btn-outline" data-act="wish" data-id="${p.id}">${Store.isWished(p.id) ? 'Saved ♥' : 'Save ♡'}</button></div>
        </div></div>`;
    Anim.modal();
    S.byId.set(p.id, p);
  }

  /* ---------- order confirmation ---------- */
  function checkout() {
    if (!Store.cart.length) return;
    const o = Store.placeOrder();
    closeDrawer(); updateCounts();
    openModal(`<div class="confirm"><h2>Thank you, your order is placed.</h2>
      <p>Order <b>${o.id}</b> · ${o.count} item${o.count > 1 ? 's' : ''} · <b>${money(o.total)}</b></p>
      <p>We’ve saved the order on this device. A confirmation would be emailed in a live shop.</p>
      <button class="btn btn-dark" data-act="mclose">Keep shopping</button></div>`);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = +el.dataset.id, p = S.byId.get(id);
    switch (el.dataset.act) {
      case 'add': if (p) { Anim.fly(el); Store.addToCart(p); updateCounts(); toast('Added to your bag'); if ($('#drawer').classList.contains('open')) renderDrawer(); } break;
      case 'wish': if (p) { const on = Store.toggleWish(p); Anim.pop(el); updateCounts(); toast(on ? 'Saved to wishlist' : 'Removed from wishlist'); if (el.closest('.m-actions')) el.textContent = on ? 'Saved ♥' : 'Save ♡'; } break;
      case 'view': showProduct(id); break;
      case 'inc': Store.changeQty(id, 1); updateCounts(); renderDrawer(); break;
      case 'dec': Store.changeQty(id, -1); updateCounts(); renderDrawer(); break;
      case 'rm': Store.removeFromCart(id); updateCounts(); renderDrawer(); break;
      case 'move': if (p) { Store.addToCart(p); Store.toggleWish(p); updateCounts(); renderDrawer(); toast('Moved to your bag'); } break;
      case 'wish-rm': Store.wish = Store.wish.filter(w => w.id !== id); Store.save(); updateCounts(); renderDrawer(); break;
      case 'close': closeDrawer(); break;
      case 'mclose': closeModal(); break;
      case 'thumb': $('#mMain').src = el.dataset.src; break;
      case 'checkout': checkout(); break;
      case 'retry': loadCatalog(); break;
      case 'chip': S.cat = el.dataset.slug; S.shown = S.step; renderChips(); renderGrid(); break;
      case 'cat': S.cat = el.dataset.slug; S.shown = S.step; renderChips(); renderGrid(); $('#trending').scrollIntoView({ behavior: 'smooth' }); break;
      case 'reset': S.cat = 'all'; S.q = ''; $('#searchInput').value = ''; S.pool = S.all; S.shown = S.step; renderChips(); renderGrid(); break;
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'couponForm') {
      e.preventDefault();
      const code = $('#couponInput').value;
      couponMsg = code.trim() ? Store.applyCoupon(code) : (Store.removeCoupon(), { ok: true, msg: 'Coupon removed.' });
      renderDrawer();
    }
  });

  $('#cartBtn').onclick = () => { couponMsg = null; openDrawer('cart'); };
  $('#wishBtn').onclick = () => openDrawer('wish');
  $('#scrim').onclick = () => { closeModal(); closeDrawer(); showScrim(false); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); showScrim(false); } });

  $('#searchBtn').onclick = () => { $('#trending').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('#searchInput').focus(), 500); };
  $('#searchInput').addEventListener('input', (e) => { clearTimeout(searchT); searchT = setTimeout(() => runSearch(e.target.value), 350); });
  $('#sortSel').onchange = (e) => { S.sort = e.target.value; S.shown = S.step; renderGrid(); };
  $('#moreBtn').onclick = () => { const from = S.shown; S.shown += S.step; renderGrid(from); };

  $$('[data-scroll]').forEach(b => b.onclick = () => { const r = $('#newRail'); r.scrollBy({ left: +b.dataset.scroll * (r.clientWidth * 0.8), behavior: 'smooth' }); });

  /* mobile nav */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  menuBtn.onclick = () => { const open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', open); };
  $$('#nav a').forEach(a => a.onclick = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); });

  /* newsletter */
  $('#newsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#newsEmail').value.trim(), msg = $('#newsMsg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = 'Enter a valid email address, like you@example.com.'; msg.className = 'form-msg bad'; return; }
    const list = Store.read('lr_news', []); if (!list.includes(v)) list.push(v); Store.write('lr_news', list);
    msg.textContent = 'You’re in. Check your inbox for your welcome code.'; msg.className = 'form-msg ok'; e.target.reset();
  });

  const refreshAOS = () => window.AOS && AOS.refreshHard();
  if (window.AOS) AOS.init({ duration: 800, once: true, offset: 60, easing: 'ease-out-cubic', disable: matchMedia('(prefers-reduced-motion: reduce)').matches });
  updateCounts();
  loadCatalog();
})();
