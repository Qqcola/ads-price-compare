const { expect } = require("chai");
const { paginate } = require("../src/utils/view-logic");

describe("Pagination helper", () => {
  const data = Array.from({ length: 51 }, (_, i) => i + 1);

  it("returns 20 items on page 1", () => {
    const r = paginate(data, 1, 20);
    expect(r.items).to.have.lengthOf(20);
    expect(r.total).to.equal(51);
    expect(r.totalPages).to.equal(3);
  });

  it("returns 11 items on last page", () => {
    const r = paginate(data, 3, 20);
    expect(r.items).to.have.lengthOf(11);
  });

  it("clamps page bounds", () => {
    expect(paginate(data, 0, 20).page).to.equal(1);
    expect(paginate(data, 99, 20).page).to.equal(3);
  });
});
