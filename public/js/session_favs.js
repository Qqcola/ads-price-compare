// public/js/session_favs.js
// User-scoped "My List" (namespaced by user email). No backend/auth changes.
// Keeps ADSFav API synchronous so your existing code continues to work.

(function () {
  const BASE_KEY = "ads_favs_v1";       // guest bucket
  const PREFIX   = "ads_favs_v1::user:email:"; // user bucket prefix

  // --- resolve current user once, synchronously ---
  function syncJSON(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);   // sync
      xhr.withCredentials = true;
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try { return JSON.parse(xhr.responseText); } catch { return null; }
      }
    } catch {}
    return null;
  }

  function namespaceKey() {
    const me = syncJSON("/api/me");
    // Logged-in → use stable per-user namespace
    if (me && me.ok && me.user && me.user.email) {
      return PREFIX + String(me.user.email).toLowerCase();
    }
    // Not logged in → guest bucket
    return BASE_KEY;
  }

  const LS_KEY = namespaceKey();
  // Debug helper (optional): check active namespace in console
  window.__ADS_FAVS_NS__ = LS_KEY;

  // --- storage helpers ---
  function load()      { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") || []; } catch { return []; } }
  function save(arr=[]) { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

  // --- logic from favs.js so behavior is identical ---
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  const canonImg = (u) => {
    if (!u) return "";
    try { const url = new URL(u); return `${url.hostname.replace(/^www\./,"").toLowerCase()}${url.pathname.toLowerCase()}`; }
    catch { return (u.split("?")[0] || "").toLowerCase(); }
  };
  const keyFor = (p) => `k:${norm(p?.name || p?.title)}|${canonImg(p?.img_url)}`;

  const mergeMaps = (a = {}, b = {}) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b || {})) if (out[k] == null && v != null) out[k] = v;
    return out;
  };
  const mergeProducts = (a = {}, b = {}) => {
    const out = { ...a, _id: a._id || b._id };
    out.price = mergeMaps(a.price, b.price);
    out.url   = mergeMaps(a.url, b.url);
    const aCnt = Number(a.count_reviews) || 0;
    const bCnt = Number(b.count_reviews) || 0;
    if (bCnt > aCnt) {
      out.count_reviews = b.count_reviews;
      out.avg_reviews   = (Number.isFinite(Number(b.avg_reviews)) ? Number(b.avg_reviews) : a.avg_reviews) ?? null;
    }
    return out;
  };
  const compact = (arr = []) => {
    const m = new Map();
    for (const p of arr) {
      const k = keyFor(p);
      if (!m.has(k)) m.set(k, p);
      else m.set(k, mergeProducts(m.get(k), p));
    }
    return Array.from(m.values());
  };

  // --- user-scoped ADSFav (sync API) ---
  const SessionFav = {
    upsert(p) {
      const list = compact(load());
      const k = keyFor(p);
      const i = list.findIndex((x) => keyFor(x) === k);
      if (i >= 0) list[i] = mergeProducts(list[i], p);
      else list.push(p);
      save(list);
    },
    all() {
      const list = compact(load());
      save(list);
      return list;
    },
    updateMeta(idOrKey, meta) {
      const list = load();
      const i = list.findIndex((x) => keyFor(x) === idOrKey || x._id === idOrKey);
      if (i >= 0) { list[i] = { ...list[i], ...meta }; save(compact(list)); }
    },
    remove(idOrKey) {
      const list = load().filter((x) => !(keyFor(x) === idOrKey || x._id === idOrKey));
      save(compact(list));
    },
    clear() {
      // Clear ONLY this user's namespace (never merges across users)
      save([]);
    }
  };

  // Replace global API (we load this AFTER favs.js)
  window.ADSFav = SessionFav;
})();
