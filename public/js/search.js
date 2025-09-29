// public/js/search.js — search + pagination + "Save" + strong de-duplication
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const PAGE_SIZE = 20;
  const MAX_RETAILERS_PER_CARD = 2;
  const TITLE_MAX_CHARS = 58;
  const PLACEHOLDER_IMG = "/images/placeholder.png";
  const isNum = (x) => Number.isFinite(x);

  // ---------- helpers ----------
  const getParam = (k) => new URLSearchParams(window.location.search).get(k) || "";

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
    try {
      const url = new URL(u);
      return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.toLowerCase()}`;
    } catch {
      return (u.split("?")[0] || "").toLowerCase();
    }
  };

  // Primary key is (normalized name/title + canonical image path)
  const keyFor = (doc) => `k:${norm(doc?.name || doc?.title)}|${canonImg(doc?.img_url)}`;

  const mergeObjects = (a = {}, b = {}) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b || {})) {
      if (out[k] == null && v != null) out[k] = v;
    }
    return out;
  };

  const cheapestPrice = (doc) => {
    const nums = Object.values(doc?.price || {}).map(toNumber).filter(Number.isFinite);
    return nums.length ? Math.min(...nums) : Infinity;
  };

  function dedupeProducts(list) {
    const map = new Map();
    for (const p of list || []) {
      const k = keyFor(p);
      if (!map.has(k)) {
        map.set(k, { ...p });
      } else {
        const cur = map.get(k);
        cur.price = mergeObjects(cur.price, p.price);
        cur.url   = mergeObjects(cur.url,   p.url);
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
  }

  // ---------- card ----------
  function card(doc, idx) {
    const fullName = doc.name || doc.title || "Unnamed product";
    const name     = truncateTitle(fullName);
    theImg = getImageUrl(doc);
    const imgUrl   = theImg;
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

  // ---------- pagination + wiring ----------
  let ALL = [];
  let currentPage = 1;
  let CURRENT_SLICE = [];

  const resultsGrid = $("#results-grid");
  const pagerWrap = $("#pager-wrap");
  const pager = $("#pager");
  const titleEl = $("#results-title");

  function renderPage() {
    const total = ALL.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    CURRENT_SLICE = ALL.slice(start, end);

    resultsGrid.innerHTML = CURRENT_SLICE.map((d, i) => card(d, i)).join("");
    wireFavs();

    pager.innerHTML = "";
    pagerWrap.style.display = total > PAGE_SIZE ? "block" : "none";
    if (total <= PAGE_SIZE) return;

    const li = (cls, html, disabled, page) => {
      const el = document.createElement("li");
      el.className = `${cls}${disabled ? " disabled" : " waves-effect"}`;
      el.innerHTML = `<a href="#!">${html}</a>`;
      if (!disabled) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          currentPage = Number(page);
          renderPage();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      return el;
    };

    const totalPagesToShow = 7, half = Math.floor(totalPagesToShow / 2);
    let startPage = Math.max(1, currentPage - half);
    let endPage = Math.min(totalPages, startPage + totalPagesToShow - 1);
    startPage = Math.max(1, endPage - totalPagesToShow + 1);

    pager.appendChild(li("", "<i class='material-icons'>chevron_left</i>", currentPage === 1, currentPage - 1));
    for (let p = startPage; p <= endPage; p++) {
      const item = document.createElement("li");
      item.className = `${p === currentPage ? "active" : "waves-effect"}`;
      item.innerHTML = `<a href="#!">${p}</a>`;
      item.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = Number(p);
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      pager.appendChild(item);
    }
    pager.appendChild(li("", "<i class='material-icons'>chevron_right</i>", currentPage === totalPages, currentPage + 1));
  }

  function wireFavs() {
    $all(".fav-add", resultsGrid).forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        const doc = CURRENT_SLICE[idx];
        if (!doc || !window.ADSFav) return;
        // Save with canonical de-duplication in favs.js
        ADSFav.upsert(doc);
        if (window.M && M.toast) M.toast({ html: "Saved to My List" });
      });
    });
  }

  // ---------- on-page search bar wiring (doesn't affect grid) ----------
  function wireSearchBar(qInitial) {
    const form  = $("#page-search-form");
    const input = $("#page-search-input");
    const icon  = $("#page-search-go");

    if (input && qInitial) input.value = qInitial;

    const go = () => {
      const q = input?.value?.trim();
      if (!q) return;
      window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
    };

    if (form)  form.addEventListener("submit", (e) => { e.preventDefault(); go(); });
    if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    if (icon)  icon.addEventListener("click", go);
  }

  // ---------- fetch + boot ----------
  async function load() {
    const q = getParam("q").trim();
    document.title = q ? `Search – ${q} | ADS` : "Search | ADS";
    if (titleEl) titleEl.textContent = q ? `Results for: ${q}` : "Results";

    wireSearchBar(q); // <-- only addition

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const raw = res.ok ? (await res.json()) : [];
      ALL = dedupeProducts(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error(e);
      ALL = [];
    }

    currentPage = 1;
    renderPage();
  }

  load();
})();
