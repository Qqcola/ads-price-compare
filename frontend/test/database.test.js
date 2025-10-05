const { expect } = require("chai");
const mongoose = require("mongoose");

const {
  MONGODB_APP_USER,
  MONGODB_APP_PASSWORD,
  MONGODB_HOST,
  MONGODB_PORT,
  MONGODB_DB_NAME,
} = process.env;

const COLLECTION_ITEM_NAME = 'items';

const mongoUri = `mongodb://${encodeURIComponent(MONGODB_APP_USER)}:${encodeURIComponent(MONGODB_APP_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB_NAME}?authSource=${MONGODB_DB_NAME}`;

const Items = require("../src/models/Items");

describe("MongoDB Connection and Data Tests", function() {
    before(function(done) {
        mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => {
            done();
        })
        .catch(err => {
            console.error("Connection error during setup:", err);
            done(err);
        });
    });

    after(function(done) {
        mongoose.disconnect()
        .then(() => {
            console.log("Disconnected from MongoDB. Exiting.");
            done();
        })
        .catch(err => {
            console.error("Error disconnecting from MongoDB:", err);
            done(err);
        });
    });

    it("should connect to MongoDB successfully", function() {
        expect(mongoose.connection.readyState).to.equal(1, "Mongoose connection state should be 1 (connected)");
    });
    it(`should have the collection '${COLLECTION_ITEM_NAME}'`, async function() {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        expect(collectionNames).to.include(COLLECTION_ITEM_NAME, `Collection '${COLLECTION_ITEM_NAME}' not found in DB`);
    });
    it(`should have at least a numer of items in the collection`, async function() {
        const MIN_ITEM_COUNT = process.env.DEPLOYMENT_ENV == 'github'? 15 : 15000;
        const count = await Items.countDocuments();
        expect(count).to.be.at.least(MIN_ITEM_COUNT, `Item count (${count}) is less than minimum required (${MIN_ITEM_COUNT})`);
    });
    it("should have documents with required fields", async function() {
        const item = await Items.findOne({}); 
        expect(item).to.exist;
        expect(item.name).to.be.a('string');
        expect(item.price).to.be.a('object');
        expect(item.img_url).to.be.a('string');
        expect(item.id).to.be.a('string');
    });

    describe("Database Query Tests", function() {
        it("should find the sample item by id", async function() {
            const item = await Items.findOne({ id: "2728062"});
            expect(item).to.exist;
            expect(item.name.toLowerCase()).to.equal("Panadol Rapid Paracetamol Pain Relief 16 Caplets".toLowerCase());
        });
        it("should find items with brands: Panadol", async function() {
            const items = await Items.find({ brand: "Panadol" });
            expect(items.length).to.be.above(80);
        });
        it("No product should have a negative price", async function() {
            const countItems = await Items.countDocuments({ "price.chemist_warehouse": { $lt: 0 } });
            expect(countItems).to.equal(0);
        });
    })
})







