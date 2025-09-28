// public/js/favs.js
(function (g) {
  const KEY = "ads:favs:v1";

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }
  function saveAll(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  function idFor(doc) {
    // prefer real id; fallback to a stable hash of name+img
    if (doc && doc._id) return String(doc._id);
    const base = `${doc?.name || doc?.title || ""}|${doc?.img_url || ""}`;
    // simple 32-bit hash
    let h = 0; for (let i = 0; i < base.length; i++) { h = (h << 5) - h + base.charCodeAt(i); h |= 0; }
    return `gen_${Math.abs(h)}`;
  }

  function minimal(doc) {
    const id = idFor(doc);
    return {
      _id: id,
      name: doc?.name || doc?.title || "Unnamed product",
      img_url: doc?.img_url || "",
      avg_reviews: doc?.avg_reviews ?? null,
      count_reviews: doc?.count_reviews ?? null,
      // cheapest price + first retailer link (optional convenience)
      price: doc?.price || {},
      url: doc?.url || {},
      note: "", qty: 1
    };
  }

  function upsert(doc) {
    const id = idFor(doc);
    const list = all();
    const i = list.findIndex(x => x._id === id);
    if (i >= 0) {
      // merge basic props (do not overwrite user note/qty)
      list[i] = { ...list[i], ...minimal(doc), note: list[i].note || "", qty: list[i].qty || 1 };
    } else {
      list.push(minimal(doc));
    }
    saveAll(list);
    return id;
  }

  function remove(id) {
    const list = all().filter(x => x._id !== id);
    saveAll(list);
  }

  function clear() { saveAll([]); }

  function updateMeta(id, { note, qty }) {
    const list = all();
    const i = list.findIndex(x => x._id === id);
    if (i >= 0) {
      if (typeof note === "string") list[i].note = note;
      if (qty != null) list[i].qty = Math.max(1, Number(qty) || 1);
      saveAll(list);
    }
  }

  g.ADSFav = { KEY, all, saveAll, idFor, upsert, remove, clear, updateMeta };
})(window);
