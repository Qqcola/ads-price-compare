const { expect } = require("chai");
const { dedupeProducts } = require("../src/utils/view-logic");

describe("Search de-duplication", () => {
  it("dedupes by _id and by (name+img) fallback and merges retailer data", () => {
    const data = [
      {
        _id: "A",
        name: "Panadol Rapid",
        img_url: "https://img/panadol-rapid.png",
        count_reviews: 3,
        avg_reviews: 4.0,
        price: { chemist_warehouse: 5.49 },
        url:   { chemist_warehouse: "https://cw/A" }
      },
      {
        _id: "A",
        name: "Panadol Rapid",
        img_url: "https://img/panadol-rapid.png",
        count_reviews: 12,
        avg_reviews: 4.6,
        price: { priceline: 5.99 },
        url:   { priceline: "https://pl/A" }
      },
      {
        title: "Fish Oil 1000mg 400 Caps",
        img_url: "https://img/fo.png",
        price: { woolworths: 14.00 }
      },
      {
        title: "Fish Oil 1000mg 400 Caps",
        img_url: "https://img/fo.png",
        price: { coles: 14.50 }
      },
      { _id: "B", name: "Vitamin D3 1000IU", img_url: "https://img/d3.png", price: { chemist_warehouse: 8.99 } }
    ];

    const out = dedupeProducts(data);
    expect(out).to.have.lengthOf(3);

    const A = out.find(p => p._id === "A");
    expect(A).to.exist;
    expect(A.price).to.have.keys(["chemist_warehouse", "priceline"]);
    expect(A.count_reviews).to.equal(12);
    expect(A.avg_reviews).to.equal(4.6);

    const FO = out.find(p => (p.title || p.name) === "Fish Oil 1000mg 400 Caps");
    expect(FO).to.exist;
    expect(FO.price).to.have.keys(["woolworths", "coles"]);
  });
});
