const { expect } = require("chai");
const { reviewsLabel, toNumber, isNum } = require("../src/utils/view-logic");

describe("Reviews label logic", () => {
  it("shows 'Not yet reviewed' for null/undefined/garbage", () => {
    ["", null, undefined, "abc", "NaN", {}, []].forEach(v => {
      expect(reviewsLabel(v)).to.equal("Not yet reviewed");
    });
  });

  it("extracts numbers from strings and shows '<n> reviews'", () => {
    expect(reviewsLabel(0)).to.equal("0 reviews");
    expect(reviewsLabel(5)).to.equal("5 reviews");
    expect(reviewsLabel("12")).to.equal("12 reviews");
    expect(reviewsLabel("  34 reviews")).to.equal("34 reviews");
  });

  it("toNumber mirrors UI behaviour", () => {
    expect(toNumber("5 reviews")).to.equal(5);
    expect(toNumber("abc")).to.equal(null);
    expect(isNum(toNumber(4.2))).to.equal(true);
    expect(isNum(toNumber("NaN"))).to.equal(false);
  });
});
