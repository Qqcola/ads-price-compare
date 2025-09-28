// public/js/list.js — "My List" page with all retailers (price + link)
(function () {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const clearBtn = document.getElementById("clear-all");
  const PLACEHOLDER_IMG = "/images/placeholder.png";

  // ---- helpers ----
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
  const fmtCurrency = (v) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    try { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(v)); }
    catch { return `$${Number(v).toFixed(2)}`; }
  };
  const titleizeKey = (k) => String(k || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Build retailer rows (merge the product's price + url maps)
  function extractRetailers(p) {
    const priceObj = (p && typeof p.price === "object") ? p.price : {};
    const urlObj   = (p && typeof p.url   === "object") ? p.url   : {};
    const keys = new Set([...Object.keys(priceObj || {}), ...Object.keys(urlObj || {})]);
    const out = [];
    for (const key of keys) {
      const price = toNumber(priceObj[key]);
      const url   = typeof urlObj[key] === "string" ? urlObj[key] : "";
      if (price != null || url) out.push({ key, name: titleizeKey(key), price, url });
    }
    out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return out;
  }

  function cheapest(p) {
    const prices = Object.values(p.price || {}).map(toNumber).filter(isNum);
    return prices.length ? Math.min(...prices) : null;
  }

  function render() {
    const items = ADSFav.all(); // stored full product docs
    countEl.textContent = `(${items.length})`;

    if (!items.length) {
      listEl.innerHTML = `<li class="collection-item">No saved items yet.</li>`;
      return;
    }

    listEl.innerHTML = items.map((p) => {
      const fullName = p.name || p.title || "Unnamed product";
      const img = (/^https?:\/\//i.test(p.img_url || "")) ? p.img_url : PLACEHOLDER_IMG;
      const cheapestPrice = cheapest(p);

      const reviews = toNumber(p.count_reviews);
      const reviewsText = isNum(reviews) ? `${reviews} reviews` : "Not yet reviewed";

      const retailers = extractRetailers(p);
      const retailersHtml = retailers.length
        ? `<div class="retailer-list">
             ${retailers.map(r => `
               <div class="retailer-row">
                 <span class="retailer-name">${r.name}</span>
                 <span class="retailer-price">${r.price != null ? fmtCurrency(r.price) : "<span class='retailer-muted'>—</span>"}</span>
                 ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn-flat retailer-view">VIEW</a>` : `<span></span>`}
               </div>
             `).join("")}
           </div>`
        : `<div class="retailer-muted" style="margin-top:6px;">No retailer data.</div>`;

      return `
        <li class="collection-item">
          <div class="list-card">
            <img src="${img}" alt="${fullName}">
            <div class="list-main">
              <div class="list-title" title="${fullName}">${fullName}</div>
              <div class="list-meta">
                ${cheapestPrice != null ? `Cheapest: ${fmtCurrency(cheapestPrice)}` : "Cheapest: —"} • ${reviewsText}
              </div>
              ${retailersHtml}
              <div class="note-row">
                <input type="text" class="note" placeholder="Add a note…" value="${p.note || ""}" data-id="${p._id}">
                <input type="number" class="qty" min="1" value="${p.qty || 1}" style="width:100px" data-id="${p._id}">
                <a href="#!" class="btn-small save" data-id="${p._id}">Save</a>
                <a href="#!" class="btn-small red lighten-1 remove" data-id="${p._id}"><i class="material-icons">delete</i></a>
              </div>
            </div>
          </div>
        </li>`;
    }).join("");

    // Wire buttons
    listEl.querySelectorAll(".save").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const note = listEl.querySelector(`.note[data-id="${id}"]`)?.value || "";
        const qty = Number(listEl.querySelector(`.qty[data-id="${id}"]`)?.value || 1) || 1;
        ADSFav.updateMeta(id, { note, qty });
        if (window.M && M.toast) M.toast({ html: "Saved" });
      });
    });
    listEl.querySelectorAll(".remove").forEach(btn => {
      btn.addEventListener("click", () => {
        ADSFav.remove(btn.dataset.id);
        render();
        if (window.M && M.toast) M.toast({ html: "Removed" });
      });
    });
  }

  clearBtn.addEventListener("click", () => {
    ADSFav.clear();
    render();
    if (window.M && M.toast) M.toast({ html: "Cleared" });
  });

  render();
})();
