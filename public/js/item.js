// public/js/item.js — item detail page
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

  const getImageUrl = (doc) => (/^https?:\/\//i.test(doc?.img_url || "")) ? doc.img_url : PLACEHOLDER_IMG;

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

  const ratingStars = (avg) => {
    const n = toNumber(avg);
    if (!Number.isFinite(n)) return "";
    const v = Math.max(0, Math.min(5, n));
    const full = Math.floor(v);
    return `<span style="color:#FFD700;">${"★".repeat(full)}${"☆".repeat(5-full)}</span>
            <span class="ads-muted" style="margin-left:6px">${v.toFixed(1)}</span>`;
  };

  // ---------- Similar products slider ----------
  function activateSwitchSimilarProduct() {
    const track = document.getElementById("track");
    const viewport = document.getElementById("viewport");
    const btnL = document.querySelector(".btn-left");
    const btnR = document.querySelector(".btn-right");

    let index = 0;

    const getGap = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap")) || 12;
    const getVisible = () => Math.max(1, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--visible") || "5"));

    const computeSizes = () => {
      const firstCard = track.querySelector(".card");
      if (!firstCard) return { cardWidth: 0, gap: 0 };
      const gap = getGap();
      const cardRect = firstCard.getBoundingClientRect();
      return { cardWidth: cardRect.width, gap, visible: getVisible() };
    };

    function updateButtons() {
      const visible = getVisible();
      const total = track.children.length;
      const maxIndex = Math.max(0, total - visible);
      btnL.style.opacity = index <= 0 ? "0.35" : "1";
      btnR.style.opacity = index >= maxIndex ? "0.35" : "1";
    }

    function slideToIndex(target) {
      const total = track.children.length;
      const visible = getVisible();
      const gap = getGap();
      const { cardWidth } = computeSizes();
      const maxIndex = Math.max(0, total - visible);
      index = Math.max(0, Math.min(target, maxIndex));
      const offset = index * (cardWidth + gap);
      const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
      const finalOffset = Math.min(offset, maxOffset);
      track.style.transform = `translateX(-${finalOffset}px)`;
      updateButtons();
    }

    btnL.addEventListener("click", () => slideToIndex(index - 1));
    btnR.addEventListener("click", () => slideToIndex(index + 1));

    window.populateSimilar = function (items) {
      track.innerHTML = "";
      const used = (items || []).slice(0, 15);
      used.forEach((it, idx) => {
        const el = document.createElement("div");
        el.className = "card";
        const price = (extractRetailers(it)[0] || {}).price;
        el.innerHTML = `
          <img class="rect" src="${getImageUrl(it)}" referrerpolicy="no-referrer">
          <a class="name" href="/item?id=${it._id || it.id}">${(it.name || `Product ${idx+1}`)}</a>
          <div class="price">${price != null ? fmtCurrency(price) : ""}</div>`;
        track.appendChild(el);
      });
      index = 0;
      requestAnimationFrame(() => slideToIndex(0));
    };

    window.addEventListener("resize", () => requestAnimationFrame(() => slideToIndex(index)));
  }

  // ---------- Accordion ----------
  function activateScrollInformation() {
    const acc = document.getElementById("accordion");
    acc.querySelectorAll(".item").forEach((item) => {
      const head = item.querySelector(".head");
      const content = item.querySelector(".content");
      head.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        if (isOpen) {
          content.style.maxHeight = 0;
          item.classList.remove("open");
          head.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          item.classList.add("open");
          content.style.maxHeight = content.scrollHeight + "px";
          setTimeout(() => head.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
        }
      });
    });
  }

  // ---------- Build accordion ----------
  function createAndAppendDetailInformation(list) {
    const acc = $("#accordion");
    const html = (list || []).map((it) => `
      <div class="item" data-key="${it.key}">
        <div class="head">
          <h3>${it.title}</h3>
          <div class="chev">▾</div>
        </div>
        <div class="content"><p>${it.content || ""}</p></div>
      </div>`).join("");
    acc.innerHTML = html;
  }

  // ---------- Fetch & render ----------
  let ITEM = null;
  let SIMILAR = null;

  async function fetchItembyID() {
    const params = new URLSearchParams(window.location.search);
    const itemId = (params.get("id") || "").trim();
    if (!itemId) return;
    const res = await fetch(`/api/itemById?id=${encodeURIComponent(itemId)}`);
    if (!res.ok) return;
    const json = await res.json();
    ITEM = json.item || null;
    SIMILAR = json.similarItems || [];
    applyItemToDOM();
  }

  function applyItemToDOM() {
    if (!ITEM) return;

    // Basic fields
    $("#mainImg").src = getImageUrl(ITEM);
    $("#itemName").textContent = ITEM.name || ITEM.title || "";

    // Price (show min across retailers; NO old price)
    const rows = extractRetailers(ITEM);
    const min = rows.length ? rows[0].price : null;
    $("#itemPrice").textContent = min != null ? fmtCurrency(min) : "";

    // Reviews summary
    const rev = $("#itemReview");
    const count = toNumber(ITEM.count_reviews);
    rev.innerHTML = `${ratingStars(ITEM.avg_reviews)} ${Number.isFinite(count) ? `${count} reviews` : ""}`;

    // Retailer rows
    const list = $("#retailerList");
    list.innerHTML = rows.length
      ? rows.map(r => `
          <div class="retailer-row">
            <span class="retailer-name">${r.name}</span>
            <span class="retailer-price">${r.price != null ? fmtCurrency(r.price) : "<span class='ads-muted'>—</span>"}</span>
            ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">PURCHASE</a>` : ""}
          </div>`).join("")
      : `<p class="ads-muted" style="margin-top:6px">No retailer data.</p>`;

    // Accordion
    const sections = {
      general_information: "General Information",
      ingredients: "Ingredients",
      directions: "Directions",
      warnings: "Warnings",
    };
    const accData = Object.keys(sections)
      .filter(k => ITEM[k])
      .map(k => ({ key: k, title: sections[k], content: ITEM[k] }));
    createAndAppendDetailInformation(accData);
    activateScrollInformation();

    // Similar
    activateSwitchSimilarProduct();
    populateSimilar(SIMILAR);

    // Save button
    const saveBtn = $("#save-btn");
    if (saveBtn && window.ADSFav) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        ADSFav.upsert(ITEM);
        if (window.M && M.toast) M.toast({ html: "Saved to My List" });
      });
    }
  }

  // ---------- search bar wiring (same as My List) ----------
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
    // sidenav if present
    const sidenavs = document.querySelectorAll(".sidenav");
    if (window.M && M.Sidenav) M.Sidenav.init(sidenavs);

    wireSearchBar();
    fetchItembyID().catch(()=>{});
  });
})();
