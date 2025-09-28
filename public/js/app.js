// public/js/app.js — trending with "Save" to My List (no per-card My List link)
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MAX_RETAILERS_PER_CARD = 2;
  const TITLE_MAX_CHARS = 58;
  const PLACEHOLDER_IMG = "/images/placeholder.png";
  const isNum = (x) => Number.isFinite(x);

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
    const clipped = s.slice(0, max + 1), lastSpace = clipped.lastIndexOf(" ");
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

  function card(doc, idx) {
    const fullName = doc.name || doc.title || "Unnamed product";
    const name     = truncateTitle(fullName);
    const imgUrl   = getImageUrl(doc);
    const rating   = toNumber(doc.avg_reviews);
    const reviews  = toNumber(doc.count_reviews);
    const retailersAll = extractRetailers(doc);
    const retailers    = retailersAll.slice(0, MAX_RETAILERS_PER_CARD);
    const moreCount    = Math.max(0, retailersAll.length - retailers.length);

    const retailersHtml = retailers.length
      ? `<div class="retailer-list">
          ${retailers.map((r) => {
              const priceText = r.price != null ? fmtCurrency(r.price) : "<span class='ads-muted'>—</span>";
              const link      = r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">VIEW</a>` : "";
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
          <div class="card-image"><img src="${imgUrl}" alt="${fullName}" title="${fullName}" loading="lazy" referrerpolicy="no-referrer"></div>
          <div class="card-content">
            <span class="card-title" title="${fullName}">${name}</span>
            <div class="rating-wrap">${isNum(rating) ? renderStars(rating) : ""}</div>
            ${reviewsHtml}
            ${retailersHtml}
          </div>
          <div class="card-action">
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
      LAST = r.ok ? await r.json() : [];
      trendingGrid.innerHTML = LAST.map((d, i) => card(d, i)).join("");
      wireFavs();
    } catch (e) { console.error(e); trendingGrid.innerHTML = ""; }
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

  // Search box behaviour (unchanged)
  const input = $("#search-input"), form = $("#home-search-form"), icon = $("#home-search-go");
  function goSearch() { const q = input?.value?.trim(); if (!q) return; window.location.href = `/search.html?q=${encodeURIComponent(q)}`; }
  if (form)  form.addEventListener("submit", (e) => { e.preventDefault(); goSearch(); });
  if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); goSearch(); } });
  if (icon)  icon.addEventListener("click", goSearch);

  const y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  document.addEventListener("DOMContentLoaded", () => {
    Array.from(document.querySelectorAll(".sidenav")).forEach(el => window.M && M.Sidenav && M.Sidenav.init(el));
  });

  loadTrending();
})();
