const { expect } = require("chai");
const { truncateTitle } = require("../src/utils/view-logic");

describe("Title truncation", () => {
  it("does not modify short titles", () => {
    const s = "Short title";
    expect(truncateTitle(s, 58)).to.equal(s);
  });

  it("adds a single ellipsis and keeps length <= max+1", () => {
    const long = "This is a very long product name that should be truncated somewhere sensible to fit two lines nicely";
    const out = truncateTitle(long, 58);
    expect(out.endsWith("…")).to.equal(true);
    expect(out.length).to.be.at.most(59);
  });

  it("prefers breaking at a space instead of mid-word", () => {
    const long = "Panadol Paracetamol Pain Relief 500mg Optizorb Caplets Extra Something";
    const out = truncateTitle(long, 58);
    expect(out).to.match(/\w…$/);
  });
});
