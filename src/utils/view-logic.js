// src/utils/view-logic.js
// Pure helpers that mirror your front-end logic (search/app).

const isNum = (x) => Number.isFinite(x);

const toNumber = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  return null;
};

// The text shown for the reviews line
const reviewsLabel = (countReviews) => {
  const n = toNumber(countReviews);
  return isNum(n) ? `${n} reviews` : "Not yet reviewed";
};

const norm = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const keyFor = (doc) =>
  doc && doc._id
    ? `id:${String(doc._id)}`
    : `k:${norm(doc?.name || doc?.title)}|${norm(doc?.img_url)}`;

const mergeObjects = (a = {}, b = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (out[k] == null && v != null) out[k] = v;
  }
  return out;
};

const cheapestPrice = (doc) => {
  const nums = Object.values(doc?.price || {})
    .map(toNumber)
    .filter(Number.isFinite);
  return nums.length ? Math.min(...nums) : Infinity;
};

// De-duplicate like /public/js/search.js
const dedupeProducts = (list) => {
  const map = new Map();
  for (const p of list || []) {
    const k = keyFor(p);
    if (!map.has(k)) {
      map.set(k, { ...p });
    } else {
      const cur = map.get(k);
      cur.price = mergeObjects(cur.price, p.price);
      cur.url   = mergeObjects(cur.url,   p.url);
      // prefer better review stats
      const pCount = toNumber(p.count_reviews);
      const cCount = toNumber(cur.count_reviews);
      if ((pCount || 0) > (cCount || 0)) {
        cur.count_reviews = pCount;
        cur.avg_reviews = toNumber(p.avg_reviews) ?? cur.avg_reviews ?? null;
      }
      map.set(k, cur);
    }
  }
  const out = Array.from(map.values());
  out.sort((a, b) => {
    const pa = cheapestPrice(a), pb = cheapestPrice(b);
    if (pa !== pb) return pa - pb;
    return norm(a.name || a.title).localeCompare(norm(b.name || b.title));
  });
  return out;
};

// Same truncation you use to keep card titles even
const truncateTitle = (s, max = 58) => {
  s = (s || "").trim();
  if (s.length <= max) return s;
  const clipped = s.slice(0, max + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > 40 ? clipped.slice(0, lastSpace) : s.slice(0, max);
  return `${base}…`;
};

// Build retailer rows (merge product price/url maps), then sort by price
const extractRetailers = (p) => {
  const priceObj = (p && typeof p.price === "object") ? p.price : {};
  const urlObj   = (p && typeof p.url   === "object") ? p.url   : {};
  const keys = new Set([...Object.keys(priceObj || {}), ...Object.keys(urlObj || {})]);
  const out = [];
  for (const key of keys) {
    const price = toNumber(priceObj[key]);
    const url   = typeof urlObj[key] === "string" ? urlObj[key] : "";
    if (price != null || url) {
      out.push({
        key,
        name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        price,
        url
      });
    }
  }
  out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return out;
};

// Tiny pagination helper for unit tests (mirrors client slicing behaviour)
const paginate = (arr, page = 1, pageSize = 20) => {
  const total = Array.isArray(arr) ? arr.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  const end = start + pageSize;
  return {
    page: p,
    total,
    totalPages,
    items: (arr || []).slice(start, end)
  };
};

module.exports = {
  // numbers/reviews
  isNum,
  toNumber,
  reviewsLabel,
  // de-dupe & sorting
  dedupeProducts,
  cheapestPrice,
  // presentation
  truncateTitle,
  extractRetailers,
  // pagination
  paginate
};
