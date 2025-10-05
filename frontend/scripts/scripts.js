document.addEventListener("DOMContentLoaded", async () => {
  // Load results
  const resData = await fetch("/api/results").then(r => r.json());
  const resultsContainer = document.querySelector("#results-container");
  resultsContainer.innerHTML = resData.map(item => `
    <div class="card">
      <div class="card-content">
        <span class="card-title">${item.name || "Unnamed product"}</span>
        <p>Brand: ${item.brand || "N/A"}</p>
        <p>Price: $${item.price || "?"}</p>
      </div>
    </div>
  `).join("");

  // Load trending
  const trendData = await fetch("/api/trending").then(r => r.json());
  const trendingContainer = document.querySelector("#trending-container");
  trendingContainer.innerHTML = trendData.map(item => `
    <div class="card">
      <div class="card-content">
        <span class="card-title">${item.name || "Unnamed"}</span>
        <p>🔥 Popular!</p>
      </div>
    </div>
  `).join("");
});
