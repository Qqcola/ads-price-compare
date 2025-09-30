// public/js/list.js — render saved items in a Materialize "collection" + search bar
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const PLACEHOLDER_IMG = "/images/placeholder.png";

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

  const getImageUrl = (doc) => (/^https?:\/\//i.test(doc?.img_url || ""))
    ? doc.img_url
    : PLACEHOLDER_IMG;

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

  // Canonical key for remove (match favs.js)
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  const canonImg = (u) => {
    if (!u) return "";
    try { const url = new URL(u); return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.toLowerCase()}`; }
    catch { return (u.split("?")[0] || "").toLowerCase(); }
  };
  const keyFor = (p) => `k:${norm(p?.name || p?.title)}|${canonImg(p?.img_url)}`;

  // try to find an id suitable for /item?id=...
  const getItemId = (doc) => doc?.it_id || doc?.id || doc?._id || "";

  // ---------- render ----------
  const listEl = $("#list-collection");
  const empty = $("#empty-state");

  function ratingBlock(avg) {
    const n = toNumber(avg);
    if (!Number.isFinite(n)) return "";
    const v = Math.max(0, Math.min(5, n));
    const full = Math.floor(v);
    return `<span style="color:#FFD700;">${"★".repeat(full)}${"☆".repeat(5-full)}</span>
            <span class="ads-muted" style="margin-left:6px">${v.toFixed(1)}</span>`;
  }

  function itemRow(doc, idx) {
    const name = doc.name || doc.title || "Unnamed product";
    const img = getImageUrl(doc);
    const rows = extractRetailers(doc);
    const reviews = toNumber(doc.count_reviews);
    const idForDetails = getItemId(doc);

    const retailersHtml = rows.length
      ? rows.map(r => `
          <div class="retailer-row">
            <span class="retailer-name">${r.name}</span>
            <span class="retailer-price">${r.price != null ? fmtCurrency(r.price) : "<span class='ads-muted'>—</span>"}</span>
            ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">PURCHASE</a>` : ""}
          </div>
        `).join("")
      : `<p class="ads-muted" style="margin-top:6px">No retailer data.</p>`;

    const reviewsText = Number.isFinite(reviews) ? `${reviews} reviews` : `Not yet reviewed`;

    return `
      <li class="collection-item avatar" style="padding-right:56px;">
        <img src="${img}" alt="${name}" class="circle" referrerpolicy="no-referrer"
             onerror="this.src='${PLACEHOLDER_IMG}'" />
        <span class="title" title="${name}" style="font-weight:600">${name}</span>
        <p class="ads-muted" style="margin:.2rem 0 0;">
          ${ratingBlock(doc.avg_reviews)} ${reviewsText}
        </p>
        <div class="retailer-list">
          ${retailersHtml}
        </div>

        <div class="list-actions">
          ${idForDetails ? `<a class="btn-flat ads-action-link" href="/item?id=${encodeURIComponent(idForDetails)}">VIEW DETAILS</a>` : ``}
        </div>

        <a href="#!" class="secondary-content remove-item" data-idx="${idx}" title="Remove">
          <i class="material-icons">close</i>
        </a>
      </li>
    `;
  }

  function render() {
    const items = (window.ADSFav ? ADSFav.all() : []) || [];
    if (!items.length) {
      listEl.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    listEl.innerHTML = items.map((d, i) => itemRow(d, i)).join("");

    // Remove buttons
    $all(".remove-item", listEl).forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        const cur = ADSFav.all();
        const doc = cur[idx];
        if (!doc) return;
        const idOrKey = doc._id || keyFor(doc);
        ADSFav.remove(idOrKey);
        render();
        if (window.M && M.toast) M.toast({ html: "Removed from My List" });
      });
    });
  }

  // Clear all
  const clearBtn = $("#clear-all");
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("Clear all saved items?")) return;
      ADSFav.clear();
      render();
      if (window.M && M.toast) M.toast({ html: "Cleared" });
    });
  }

  // ---------- on-page search bar wiring ----------
  function wireSearchBar() {
    const form  = $("#page-search-form");
    const input = $("#page-search-input");
    const icon  = $("#page-search-go");

    const go = () => {
      const q = input?.value?.trim();
      if (!q) return;
      window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
    };

    if (form)  form.addEventListener("submit", (e) => { e.preventDefault(); go(); });
    if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    if (icon)  icon.addEventListener("click", go);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sidenavs = document.querySelectorAll(".sidenav");
    if (window.M && M.Sidenav) M.Sidenav.init(sidenavs);
  });

  wireSearchBar();
  render();
})();
