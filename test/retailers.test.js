const { expect } = require("chai");
const { extractRetailers } = require("../src/utils/view-logic");

describe("Retailer extraction", () => {
  it("merges price/url maps and sorts by price asc", () => {
    const p = {
      price: { chemist_warehouse: 37.47, chemist_outlet: 62.99 },
      url:   { chemist_outlet: "https://co/item", chemist_warehouse: "https://cw/item" }
    };
    const rows = extractRetailers(p);
    expect(rows.map(r => r.key)).to.have.members(["chemist_warehouse", "chemist_outlet"]);
    expect(rows[0].key).to.equal("chemist_warehouse");
    expect(rows[1].key).to.equal("chemist_outlet");
    expect(rows[0].url).to.equal("https://cw/item");
    expect(rows[1].url).to.equal("https://co/item");
  });
});
