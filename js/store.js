/* Cart, wishlist, coupon and order persistence (LocalStorage) */
const money = (n) => '$' + Number(n).toFixed(2);

const COUPONS = {
  WELCOME10: { type: 'pct',  value: 10, note: '10% off your order' },
  STYLE20:   { type: 'pct',  value: 20, min: 100, note: '20% off orders over $100' },
  FREESHIP:  { type: 'ship', note: 'free shipping' }
};

const Store = {
  read(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  init() {
    this.cart = this.read('lr_cart', []);
    this.wish = this.read('lr_wish', []);
    this.coupon = this.read('lr_coupon', null);
    this.orders = this.read('lr_orders', []);
  },
  save() {
    this.write('lr_cart', this.cart); this.write('lr_wish', this.wish);
    this.write('lr_coupon', this.coupon); this.write('lr_orders', this.orders);
  },
  addToCart(p) {
    const item = this.cart.find(i => i.id === p.id);
    if (item) item.qty++;
    else this.cart.push({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail, qty: 1 });
    this.save();
  },
  changeQty(id, d) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += d;
    if (item.qty < 1) this.removeFromCart(id); else this.save();
  },
  removeFromCart(id) { this.cart = this.cart.filter(i => i.id !== id); this.save(); },
  isWished(id) { return this.wish.some(p => p.id === id); },
  toggleWish(p) {
    const on = this.isWished(p.id);
    this.wish = on ? this.wish.filter(w => w.id !== p.id)
                   : [...this.wish, { id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail, category: p.category }];
    this.save();
    return !on;
  },
  totals() {
    const count = this.cart.reduce((n, i) => n + i.qty, 0);
    const sub = this.cart.reduce((n, i) => n + i.price * i.qty, 0);
    const c = COUPONS[this.coupon];
    let discount = 0, shipping = sub === 0 || sub >= 100 ? 0 : 6;
    if (c && c.type === 'pct' && sub >= (c.min || 0)) discount = sub * c.value / 100;
    if (c && c.type === 'ship') shipping = 0;
    return { count, sub, discount, shipping, total: sub - discount + shipping };
  },
  applyCoupon(code) {
    code = code.trim().toUpperCase();
    const c = COUPONS[code];
    if (!c) return { ok: false, msg: 'That code isn’t valid. Try WELCOME10, STYLE20 or FREESHIP.' };
    const sub = this.totals().sub;
    if (c.min && sub < c.min) return { ok: false, msg: `Add ${money(c.min - sub)} more to use ${code}.` };
    this.coupon = code; this.save();
    return { ok: true, msg: `${code} applied: ${c.note}.` };
  },
  removeCoupon() { this.coupon = null; this.save(); },
  placeOrder() {
    const t = this.totals();
    const order = {
      id: 'LR-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString(),
      items: this.cart.map(i => ({ ...i })),
      coupon: this.coupon, ...t
    };
    this.orders.push(order);
    this.cart = []; this.coupon = null; this.save();
    return order;
  }
};
Store.init();
