/* DummyJSON Products API wrapper (Fetch + async/await) */
const API_BASE = 'https://dummyjson.com';

const CATEGORIES = [
  { slug: 'womens-dresses',  label: 'Dresses' },
  { slug: 'tops',            label: 'Tops' },
  { slug: 'mens-shirts',     label: 'Men’s shirts' },
  { slug: 'womens-shoes',    label: 'Women’s shoes' },
  { slug: 'womens-bags',     label: 'Bags' },
  { slug: 'womens-jewellery',label: 'Jewellery' },
  { slug: 'mens-shoes',      label: 'Men’s shoes' },
  { slug: 'sunglasses',      label: 'Sunglasses' }
];

async function getJSON(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error('The shop could not load products (error ' + res.status + ').');
  return res.json();
}

const Api = {
  byCategory: async (slug) => (await getJSON(`/products/category/${slug}?limit=0`)).products,
  search: async (q) => (await getJSON(`/products/search?q=${encodeURIComponent(q)}&limit=0`)).products,
  one: (id) => getJSON(`/products/${id}`)
};
