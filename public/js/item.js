const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const itemId = qs.get("id") || "kangaroo-essence";

fetch("/item.json")
  .then((r) => r.json())
  .then((items) => {
    const item = items.find((p) => p.id === itemId) || items[0];
    render(item);
  })
  .catch((err) => console.error("Failed to load items.json", err));

function render(p) {
  // hero
  $("#item-image").src = p.image;
  $("#item-image").alt = p.title;
  $("#item-title").textContent = p.title;
  $("#item-subtitle").textContent = p.subtitle;

  // specs
  const specsEl = $("#specs");
  specsEl.innerHTML = "";
  Object.entries(p.specs).forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "spec";
    row.innerHTML = `<span>${k}</span><span>${v}</span>`;
    specsEl.appendChild(row);
  });

  // retailers + price
  const sel = $("#retailer-select");
  sel.innerHTML = p.retailers
    .map((r) => `<option data-price="${r.price}">${r.name}</option>`)
    .join("");
  const priceEl = $("#price");
  const updatePrice = () => {
    const opt = sel.selectedOptions[0];
    priceEl.textContent = opt ? `$${Number(opt.dataset.price).toFixed(2)}` : "";
  };
  sel.addEventListener("change", updatePrice);
  updatePrice();

  // stars + rating
  const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(p.rating), 10 - Math.round(p.rating));
  $("#stars").textContent = stars;
  $("#rating-text").textContent = `${p.rating.toFixed(1)} (${p.reviews.length} reviews)`;

  // overview + reviews
  $("#overview").innerHTML = p.overview.map((t) => `<p>${t}</p>`).join("");
  $("#reviews").innerHTML = p.reviews.map((r) => `<li><strong>${r.user}:</strong> ${r.text}</li>`).join("");

  // fake add-to-cart handler
  $("#add-to-cart").addEventListener("click", () => alert("Added to cart ✓"));
}
