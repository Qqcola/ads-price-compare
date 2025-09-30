const { expect } = require("chai");
const request = require("request");

const baseUrl = `http://localhost:3000/api/itemById`;

describe("Item API", function () {
  it("returns status 200 to check if api works", function (done) {
    request(baseUrl, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      done();
    });
  });

  it("should return the correct item based on the IP passed into the URL", function (done) {
    request.get(`${baseUrl}?id=2728073`, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      const item = JSON.parse(body)['item'];
      expect(item.name.toLowerCase()).to.equal('Panadol Rapid Paracetamol Pain Relief 48 Caplets'.toLowerCase()); 
      expect(item.brand.toLowerCase()).to.equal('Panadol'.toLowerCase());
      expect(item.price.chemist_warehouse).to.equal(12.99);
      done();
    });
  });

  it("should return the correct item based on the IP passed into the URL", function (done) {
    request.get(`${baseUrl}?id=2728073`, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      const item = JSON.parse(body)['item'];
      const similarItems = JSON.parse(body)['similarItems'].slice(0, 15);
      const brand = item.brand;
      for (let i = 0; i < similarItems.length; i++){
        expect(similarItems[i].brand).to.equal(brand);
      }
      done();
    });
  });
});