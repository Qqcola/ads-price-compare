// public/js/app.js — trending with "Save" and strong de-duplication
function main() {
  async function authUser() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.user) {
        console.log(1);
        if (data.user.email == null && data.user.jti == null){
          window.location.href = "/"
        }
      }
    } catch {
      
    }
  }
  authUser();
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MAX_RETAILERS_PER_CARD = 2;
  const TITLE_MAX_CHARS = 58;
  const PLACEHOLDER_IMG = "/images/placeholder.png";
  const isNum = (x) => Number.isFinite(x);

  // ---------- helpers ----------
  const toNumber = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") { const m = v.match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; }
    return null;
  };
  const fmtCurrency = (v) => {
    if (v == null || Number.isNaN(Number(v))) return "";
    try { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(v)); }
    catch { return `$${Number(v).toFixed(2)}`; }
  };
  const titleizeKey = (k) => String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const getImageUrl = (doc) => (/^https?:\/\//i.test(doc?.img_url || "")) ? doc.img_url : PLACEHOLDER_IMG;

  const truncateTitle = (s, max = TITLE_MAX_CHARS) => {
    s = (s || "").trim(); if (s.length <= max) return s;
    const clipped = s.slice(0, max + 1);
    const lastSpace = clipped.lastIndexOf(" ");
    const base = lastSpace > 40 ? clipped.slice(0, lastSpace) : s.slice(0, max);
    return `${base}…`;
  };

  const renderStars = (r) => {
    const n = toNumber(r); if (!isNum(n)) return "";
    const v = Math.max(0, Math.min(5, n)), full = Math.floor(v);
    return `<span style="color:#FFD700;">${"★".repeat(full)}${"☆".repeat(5-full)}</span>
            <span class="ads-muted" style="margin-left:6px">${v.toFixed(1)}</span>`;
  };

  function extractRetailers(doc) {
    const priceObj = (doc && typeof doc.price === "object") ? doc.price : {};
    const urlObj   = (doc && typeof doc.url   === "object") ? doc.url   : {};
    const keys = new Set([...Object.keys(priceObj || {}), ...Object.keys(urlObj || {})]);
    const rows = [];
    for (const key of keys) {
      const price = toNumber(priceObj[key]);
      const url   = typeof urlObj[key] === "string" ? urlObj[key] : "";
      if (price != null || url) rows.push({ key, name: titleizeKey(key), price, url });
    }
    rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return rows;
  }

  // ---------- STRONGER DE-DUPLICATION ----------
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  const canonImg = (u) => {
    if (!u) return "";
    try { const url = new URL(u); return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.toLowerCase()}`; }
    catch { return (u.split("?")[0] || "").toLowerCase(); }
  };
  const keyFor = (doc) => `k:${norm(doc?.name || doc?.title)}|${canonImg(doc?.img_url)}`;
  const mergeObjects = (a = {}, b = {}) => { const out = { ...a }; for (const [k, v] of Object.entries(b || {})) if (out[k] == null && v != null) out[k] = v; return out; };
  const cheapestPrice = (doc) => { const nums = Object.values(doc?.price || {}).map(toNumber).filter(Number.isFinite); return nums.length ? Math.min(...nums) : Infinity; };

  function dedupeProducts(list) {
    const map = new Map();
    for (const p of list || []) {
      const k = keyFor(p);
      if (!map.has(k)) map.set(k, { ...p });            // keep original fields, incl. id/_id
      else {
        const cur = map.get(k);
        cur.price = mergeObjects(cur.price, p.price);
        cur.url   = mergeObjects(cur.url,   p.url);
        const pCount = toNumber(p.count_reviews), cCount = toNumber(cur.count_reviews);
        if ((pCount || 0) > (cCount || 0)) {
          cur.count_reviews = pCount;
          cur.avg_reviews   = toNumber(p.avg_reviews) ?? cur.avg_reviews ?? null;
        }
      }
    }
    const out = Array.from(map.values());
    out.sort((a, b) => {
      const pa = cheapestPrice(a), pb = cheapestPrice(b);
      if (pa !== pb) return pa - pb;
      return norm(a.name || a.title).localeCompare(norm(b.name || b.title));
    });
    return out;
  }

  function card(doc, idx) {
    const fullName = doc.name || doc.title || "Unnamed product";
    const name     = truncateTitle(fullName);
    const imgUrl   = getImageUrl(doc);
    const rating   = toNumber(doc.avg_reviews);
    const reviews  = toNumber(doc.count_reviews);
    const retailersAll = extractRetailers(doc);
    const retailers    = retailersAll.slice(0, MAX_RETAILERS_PER_CARD);
    const moreCount    = Math.max(0, retailersAll.length - retailers.length);

    // Prefer scraped numeric id; fallback to Mongo _id if missing.
    const rawId = (doc.id ?? doc._id ?? "").toString();
    const detailsHref = rawId ? `/item?id=${encodeURIComponent(rawId)}` : "#!";

    const retailersHtml = retailers.length
      ? `<div class="retailer-list">
          ${retailers.map((r) => {
              const priceText = r.price != null ? fmtCurrency(r.price) : "<span class='ads-muted'>—</span>";
              const link      = r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">PURCHASE</a>` : "";
              return `<div class="retailer-row">
                        <span class="retailer-name">${r.name}</span>
                        <span class="retailer-price">${priceText}</span>
                        ${link}
                      </div>`;
            }).join("")}
          ${moreCount ? `<div class="retailer-more ads-muted">+ ${moreCount} more retailer${moreCount > 1 ? 's' : ''}</div>` : ``}
        </div>`
      : `<p class="ads-muted" style="margin-top:8px">No retailer data.</p>`;

    const reviewsHtml = isNum(reviews)
      ? `<p class="ads-muted reviews-line">${reviews} reviews</p>`
      : `<p class="ads-muted reviews-line">Not yet reviewed</p>`;

    return `
      <div class="col s12 m6 l3">
        <div class="card white hoverable">
          <a class="card-image" href="${detailsHref}" aria-label="View details">
            <img src="${imgUrl}" alt="${fullName}" title="${fullName}" loading="lazy" referrerpolicy="no-referrer">
          </a>
          <div class="card-content">
            <a class="card-title" title="${fullName}" href="${detailsHref}">${name}</a>
            <div class="rating-wrap">${isNum(rating) ? renderStars(rating) : ""}</div>
            ${reviewsHtml}
            ${retailersHtml}
          </div>
          <div class="card-action" style="display:flex;justify-content:space-between;align-items:center;">
            <a href="${detailsHref}" class="details-link">VIEW DETAILS</a>
            <a href="#!" class="fav-add" data-idx="${idx}"><i class="material-icons left">favorite</i>Save</a>
          </div>
        </div>
      </div>`;
  }

  const trendingGrid = document.getElementById("trending-grid");
  let LAST = [];

  async function loadTrending() {
    try {
      const r = await fetch("/api/trending");
      const docs = r.ok ? await r.json() : [];
      LAST = dedupeProducts(docs);
      trendingGrid.innerHTML = LAST.map((d, i) => card(d, i)).join("");
      wireFavs();
    } catch (e) {
      console.error(e);
      trendingGrid.innerHTML = "";
    }
  }

  function wireFavs() {
    $all(".fav-add", trendingGrid).forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        const doc = LAST[idx];
        if (!doc || !window.ADSFav) return;
        ADSFav.upsert(doc);
        if (window.M && M.toast) M.toast({ html: "Saved to My List" });
      });
    });
  }

  // Search box behaviour (page search preferred)
  const form  = $("#page-search-form")  || $("#home-search-form");
  const input = $("#page-search-input") || $("#search-input");
  const icon  = $("#page-search-go")    || $("#home-search-go");

  function goSearch() {
    const q = input?.value?.trim();
    if (!q) return;
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  }
  if (form)  form.addEventListener("submit", (e) => { e.preventDefault(); goSearch(); });
  if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); goSearch(); } });
  if (icon)  icon.addEventListener("click", goSearch);

  const y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
  document.addEventListener("DOMContentLoaded", () => {
    Array.from(document.querySelectorAll(".sidenav")).forEach(el => window.M && M.Sidenav && M.Sidenav.init(el));
  });

  loadTrending();
};

main();
