/* public/js/search.js
   - Results page: ALL matches
   - Product cards show retailers capped to keep equal heights
   - Ratings + review counts
*/
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MAX_RETAILERS_PER_CARD = 2;
  const isNum = (x) => Number.isFinite(x);

  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') || '').trim();
  $("#year").textContent = new Date().getFullYear();
  $("#query-text").textContent = q || "—";

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

  const titleizeKey = (k) =>
    String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

  const renderStars = (r) => {
    const n = toNumber(r);
    if (!isNum(n)) return "";
    const v = Math.max(0, Math.min(5, n));
    const full = Math.floor(v);
    return `
      <span style="color:#FFD700;">${"★".repeat(full)}${"☆".repeat(5-full)}</span>
      <span class="ads-muted" style="margin-left:6px">${v.toFixed(1)}</span>
    `;
  };

  function card(doc) {
    const name    = doc.name || doc.title || "Unnamed product";
    const img     = (typeof doc.img_url === "string" && /^https?:\/\//i.test(doc.img_url)) ? doc.img_url : "";
    const rating  = toNumber(doc.avg_reviews);
    const reviews = toNumber(doc.count_reviews);

    const retailersAll = extractRetailers(doc);
    const retailers    = retailersAll.slice(0, MAX_RETAILERS_PER_CARD);
    const moreCount    = Math.max(0, retailersAll.length - retailers.length);

    const retailersHtml = retailers.length
      ? `<div class="retailer-list">
          ${retailers.map((r) => {
              const priceText = r.price != null ? fmtCurrency(r.price) : "<span class='ads-muted'>—</span>";
              const link      = r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">View</a>` : "";
              return `
                <div class="retailer-row">
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
        <div class="card white ads-card hoverable">
          ${img ? `
            <div class="card-image img-wrap">
              <img src="${img}" alt="${name}" loading="lazy" referrerpolicy="no-referrer">
            </div>` : ``}
          <div class="card-content card-body">
            <span class="card-title product-title">${name}</span>
            ${isNum(rating) ? `<div class="rating-wrap">${renderStars(rating)}</div>` : ``}
            ${reviewsHtml}
            ${retailersHtml}
          </div>
        </div>
      </div>
    `;
  }

  const grid = $("#results-grid");
  const empty = $("#results-empty");

  async function runSearch() {
    if (!q) { grid.innerHTML = ""; empty.style.display = "block"; return; }
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=200`);
      const docs = r.ok ? await r.json() : [];
      if (!docs.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
      empty.style.display = "none";
      grid.innerHTML = docs.map(card).join("");
    } catch (e) {
      console.error(e);
      grid.innerHTML = ""; empty.style.display = "block";
    }
  }

  const form  = $("#results-search-form");
  const input = $("#results-search-input");
  const icon  = $("#results-search-go");
  if (input) input.value = q;

  function goSearch() {
    const qq = input?.value?.trim();
    if (!qq) return;
    window.location.href = `/search.html?q=${encodeURIComponent(qq)}`;
  }
  if (form)  form.addEventListener("submit", (e) => { e.preventDefault(); goSearch(); });
  if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); goSearch(); } });
  if (icon)  icon.addEventListener("click", goSearch);

  document.addEventListener("DOMContentLoaded", () => {
    $all(".sidenav").forEach(el => M.Sidenav.init(el));
  });

  runSearch();
})();
