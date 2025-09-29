function activateSwitchSimilarProduct() {
  const track = document.getElementById("track");
  const viewport = document.getElementById("viewport");
  const btnL = document.querySelector(".btn-left");
  const btnR = document.querySelector(".btn-right");
  const visibleCountEl = document.getElementById("visibleCount");

  let index = 0; // index of the left-most visible card

  function getGap() {
    return (
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--gap")
      ) || 12
    );
  }

  function getVisible() {
    // read CSS variable --visible (string) and parse to int
    const v =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--visible"
      ) || "5";
    return Math.max(1, parseInt(v));
  }

  function computeSizes() {
    // ensure cards have width set via CSS; compute a single card width (including gap)
    const firstCard = track.querySelector(".card");
    if (!firstCard) return 0;
    const gap = getGap();
    const cardRect = firstCard.getBoundingClientRect();
    const cardWidth = cardRect.width; // already computed via CSS percent rules
    return { cardWidth, gap, visible: getVisible() };
  }

  function updateVisibleCount() {
    visibleCountEl.textContent = getVisible();
  }

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
    // constrain offset not to exceed scrollable width
    const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
    const finalOffset = Math.min(offset, maxOffset);
    track.style.transform = `translateX(-${finalOffset}px)`;
    updateButtons();
  }

  btnL.addEventListener("click", () => {
    slideToIndex(index - 1);
  });
  btnR.addEventListener("click", () => {
    slideToIndex(index + 1);
  });

  // expose population method
  populateSimilar = function (items) {
    track.innerHTML = "";
    const totalItems = items && items.length ? Math.min(items.length, 15) : 15;
    // console.log(similarItemList[0]['price']['chemist_warehouse']);  
    const used = items.slice(0, totalItems);
    used.forEach((it, idx) => {
      const el = document.createElement("div");
      el.className = "card";
      const priceText = it.price.chemist_warehouse;
      el.innerHTML = `
            <img class="rect" src="">
            <div class=\"name\">${escapeHtml(
              it.name || "Sản phẩm " + (idx + 1)
            )}</div>
            <div class=\"price\">${priceText ? "$" + priceText : ""}</div>`;
      track.appendChild(el);
    });
    // reset index and layout
    index = 0;
    // immediate recompute (no setTimeout)
    updateVisibleCount();
    requestAnimationFrame(() => {
      slideToIndex(0);
    });
  };

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>\"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }

  // Recompute on resize (responsive). Using rAF to avoid layout thrash.
  let resizeTimer = null;
  function onResize() {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(() => {
      // keep current index valid
      const total = track.children.length;
      const visible = getVisible();
      const maxIndex = Math.max(0, total - visible);
      if (index > maxIndex) index = maxIndex;
      updateVisibleCount();
      slideToIndex(index);
    });
  }
  window.addEventListener("resize", onResize);

  // init skeleton
  populateSimilar(similarItemList);
}

function activateScrollInformation() {
  const acc = document.getElementById("accordion");
  acc.querySelectorAll(".item").forEach((item) => {
    const head = item.querySelector(".head");
    const content = item.querySelector(".content");
    head.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      if (isOpen) {
        // close
        content.style.maxHeight = 0;
        item.classList.remove("open");
        head.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // open this one but do NOT close others
        item.classList.add("open");
        content.style.maxHeight = content.scrollHeight + "px";
        setTimeout(
          () => head.scrollIntoView({ behavior: "smooth", block: "start" }),
          180
        );
      }
    });
  });
}
// --- Fetch item by ID and populate page ---
let item = null;
let similarItemList = null;
const itemDetailInfor = document.getElementById("accordion");

async function fetchItembyID() {
  const params = new URLSearchParams(window.location.search);
  const itemId = (params.get("id") || "").trim();
  try {
    const res = await fetch(`/api/itemById?id=${encodeURIComponent(itemId)}`);
    if (!res.ok) throw new Error("Network response not ok");
    const json = await res.json();
    item = json["item"];
    console.log(item);
    similarItemList = json["similarItems"];
    applyItemToDOM();
  } catch (e) {
    console.error(e);
  }
}

function getFirstPrice(priceObj) {
  if (!priceObj) return "";
  if (typeof priceObj === "number") return priceObj;
  if (typeof priceObj === "string") return priceObj;
  // Map-like object
  const vals = Object.values(priceObj);
  return vals.length ? vals[0] : "";
}

function createAndAppendDetailInformation(data) {
  const htmlStrings = data.map((item) => {
    return `
            <div class="item" data-key="${item.key}">
                <div class="head">
                    <h3>${item.title}</h3>
                    <div class="chev">▾</div>
                </div>
                <div class="content">
                    <p id="infoContent">
                        ${item.content}
                    </p>
                </div>
            </div>
        `;
  });
  itemDetailInfor.innerHTML += htmlStrings.join("");
}

function applyItemToDOM() {
  if (!item) return;
  // name
  const nameEl = document.getElementById("itemName");
  if (nameEl) nameEl.textContent = item.name || "";
  // id
  const idEl = document.getElementById("itemId");
  if (idEl) idEl.textContent = item.id ? "Product ID: " + item.id : "";
  // image
  const imgEl = document.getElementById("mainImg");
  if (imgEl) imgEl.src = item.img_url || imgEl.src;
  // price
  const priceEl = document.getElementById("itemPrice");
  const priceOldEl = document.getElementById("itemPriceOld");
  const p = getFirstPrice(item.price.chemist_warehouse);
  const pOld = getFirstPrice(item.price_old.chemist_warehouse);
  if (priceEl)
    priceEl.firstChild && priceEl.firstChild.nodeValue
      ? (priceEl.firstChild.nodeValue = "$" + (p || ""))
      : (priceEl.textContent = "$" + (p || ""));
  if (priceOldEl) priceOldEl.textContent = pOld ? "$" + pOld + " Old" : "";
  // reviews
  const revEl = document.getElementById("itemReview");
  if (revEl)
    revEl.textContent =
      (item.avg_reviews ? "⭐️ " + item.avg_reviews.toFixed(1) : "") +
      (item.count_reviews ? " (" + item.count_reviews + ")" : "");

  // fill accordion fields if available (safe fallback)
  const ids = {
    general_information: "General Information",
    ingredients: "Ingredients",
    directions: "Directions",
    warnings: "Warnings",
  };
  let dataSummarization = [];
  for (let id in ids) {
    if (!(id in item)) {
      continue;
    }
    let dataDiv = { key: id, title: ids[id], content: item[id] };
    dataSummarization.push(dataDiv);
  }
  createAndAppendDetailInformation(dataSummarization);
  activateScrollInformation();
  activateSwitchSimilarProduct();
}

// auto-run fetch on page load
window.addEventListener("DOMContentLoaded", () => {
  // attempt to fetch; if API not available, it's fine — placeholders remain
  fetchItembyID().catch((e) => console.warn(e));
});

const input = $("#search-input");
const form = $("#home-search-form");
const icon = $("#home-search-go");
function goSearch() {
  const q = input?.value?.trim();
  if (!q) return;
  window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
}
if (form)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    goSearch();
  });
if (input)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goSearch();
    }
  });
if (icon) icon.addEventListener("click", goSearch);
