// public/js/favs.js
// Local "My List" store with strong de-duplication (name+image canonical key)

(function () {
  const LS_KEY = "ads_favs_v1";

  // ---------- helpers ----------
  const load = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  };
  const save = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  const norm = (s) =>
    (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

  const canonImg = (u) => {
    if (!u) return "";
    try {
      const url = new URL(u);
      return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.toLowerCase()}`;
    } catch {
      // Fallback: strip querystring, lowercase
      return (u.split("?")[0] || "").toLowerCase();
    }
  };

  // One key to rule them all: name/title + canonical image path
  const keyFor = (p) => `k:${norm(p?.name || p?.title)}|${canonImg(p?.img_url)}`;

  const mergeMaps = (a = {}, b = {}) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b || {})) {
      if (out[k] == null && v != null) out[k] = v;
    }
    return out;
  };

  const mergeProducts = (a = {}, b = {}) => {
    const out = { ...a, _id: a._id || b._id };
    out.price = mergeMaps(a.price, b.price);
    out.url = mergeMaps(a.url, b.url);
    // prefer better review stats
    const aCnt = Number(a.count_reviews) || 0;
    const bCnt = Number(b.count_reviews) || 0;
    if (bCnt > aCnt) {
      out.count_reviews = b.count_reviews;
      out.avg_reviews = (Number.isFinite(Number(b.avg_reviews)) ? Number(b.avg_reviews) : a.avg_reviews) ?? null;
    }
    return out;
  };

  // Remove any duplicates already saved
  const compact = (arr) => {
    const map = new Map();
    for (const p of arr || []) {
      const k = keyFor(p);
      if (!map.has(k)) map.set(k, p);
      else map.set(k, mergeProducts(map.get(k), p));
    }
    return Array.from(map.values());
  };

  const ADSFav = {
    upsert(p) {
      // compact first (migrates older saved data)
      const list = compact(load());
      const k = keyFor(p);
      const idx = list.findIndex((x) => keyFor(x) === k);
      if (idx >= 0) list[idx] = mergeProducts(list[idx], p);
      else list.push(p);
      save(list);
    },
    all() {
      const list = compact(load());
      save(list); // write back compacted
      return list;
    },
    updateMeta(idOrKey, meta) {
      const list = load();
      // meta is user-only (note, qty); we identify by canonical key _or_ _id
      const idx = list.findIndex((x) => keyFor(x) === idOrKey || x._id === idOrKey);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...meta };
        save(compact(list));
      }
    },
    remove(idOrKey) {
      const list = load().filter((x) => !(keyFor(x) === idOrKey || x._id === idOrKey));
      save(compact(list));
    },
    clear() { save([]); }
  };

  window.ADSFav = ADSFav;
})();
