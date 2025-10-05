const { expect } = require("chai");
const request = require("supertest");
const { startServer, stopServer } = require("./setup");

const RUN_ID = Date.now();
const TEST_EMAIL = `christoraju085${RUN_ID}@gmail.com`;
const TEST_PASS = "Christo@123";

let baseURL;
let agent;

// Helpers
async function signupOrLogin(agent) {
  // Try to sign up
  const su = await agent
    .post("/signup")
    .send({
      firstName: "ADS",
      lastName: "Tester",
      email: TEST_EMAIL,
      password: TEST_PASS,
    })
    .set("Accept", "application/json");

  if (su.status === 302 || su.status === 303) {
    expect(su.headers.location).to.equal("/login.html");
  } else {
    expect(su.status).to.be.oneOf([409, 200, 400]);
  }

  // Then login
  const li = await agent
    .post("/login")
    .send({ email: TEST_EMAIL, password: TEST_PASS });
  expect(li.status).to.be.oneOf([302, 303]);
  expect(li.headers.location).to.equal("/index.html");
  return li;
}

describe("API integration across pages (health, data, item, conversations, session)", function () {
  this.timeout(45000);

  before(async () => {
    const started = await startServer();
    baseURL = started.baseURL;
    agent = request.agent(baseURL);
    await signupOrLogin(agent);
  });

  after(async () => {
    await stopServer();
  });

  it("GET /api/health → { ok: true }", async () => {
    const res = await agent.get("/api/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("ok", true);
  });

  it("GET /index.html (static) → 200 HTML", async () => {
    const res = await agent.get("/index.html");
    expect(res.status).to.equal(200);
    expect(res.headers["content-type"]).to.match(/text\/html/);
  });

  it("GET /chat (static) → 200 HTML", async () => {
    const res = await agent.get("/chat");
    expect(res.status).to.equal(200);
    expect(res.headers["content-type"]).to.match(/text\/html/);
  });

  // Catalog data used by index/search
  let sampleItemId = null;

  it("GET /api/trending → array (capture an id for item page if present)", async function () {
    const res = await agent.get("/api/trending");
    if (res.status === 404 || res.status === 501) this.skip(); // endpoint not present on this install

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");

    // Trying to take a usable id for /api/item?id=...
    const first = Array.isArray(res.body) && res.body[0] ? res.body[0] : null;
    if (first) {
      sampleItemId = String(first.id ?? first._id ?? first.it_id ?? "");
      if (!sampleItemId) sampleItemId = null;
    }
  });

  it("GET /api/search?q=vitamin → array", async function () {
    const res = await agent.get("/api/search").query({ q: "vitamin" });
    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");

    // If we didn’t capture an id from trending, try from search
    if (!sampleItemId) {
      const first = Array.isArray(res.body) && res.body[0] ? res.body[0] : null;
      if (first) {
        const maybeId = String(first.id ?? first._id ?? first.it_id ?? "");
        if (maybeId) sampleItemId = maybeId;
      }
    }
  });

  it("GET /api/item?id=:id → item details (if we have an id)", async function () {
    if (!sampleItemId) this.skip();

    const res = await agent.get("/api/item").query({ id: sampleItemId });
    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("object");

    expect(res.body).to.have.property("name").that.is.a("string");
    // Not all backends populate these; assert softly if present:
    if (res.body.price) expect(res.body.price).to.be.an("object");
    if (res.body.url) expect(res.body.url).to.be.an("object");
  });

  // Conversations API used by chatbot
  let createdConvId = `test_conv_${RUN_ID}`;
  const userIdForConv = TEST_EMAIL;

  it("POST /api/pushConversation → 200", async function () {
    const body = {
      id: createdConvId,
      user_id: userIdForConv,
      edit_time: new Date().toLocaleString(),
      name: "Test conversation",
      user_text: "Hello bot",
      bot_text: "Hi there!",
    };
    const res = await agent.post("/api/pushConversation").send(body);
    if (res.status === 404 || res.status === 501) this.skip();

    expect([200, 201]).to.include(res.status);
  });

  it("POST /api/findConversationByUser → array includes our conversation", async function () {
    const res = await agent
      .post("/api/findConversationByUser")
      .send({ user_id: userIdForConv });

    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");

    const found = res.body.find((c) => c.id === createdConvId);
    expect(!!found).to.equal(true);
  });

  it("PUT /api/updateConversation → 200", async function () {
    const res = await agent.put("/api/updateConversation").send({
      id: createdConvId,
      user_text: "Follow-up question",
      bot_text: "Follow-up answer",
      edit_time: new Date().toLocaleString(),
    });

    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
  });

  it("PUT /api/deleteConversationById → 200", async function () {
    const res = await agent
      .put("/api/deleteConversationById")
      .send({ id: createdConvId });

    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
  });

  // Session & profile
  it("GET /api/session → { ok: true, jti } (when logged in)", async function () {
    const res = await agent.get("/api/session");
    if (res.status === 404 || res.status === 501) this.skip();

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("ok", true);
    if (res.body.jti !== null) {
      expect(res.body.jti).to.be.a("string");
    }
  });

  it("GET /api/me → ok:true with user (email matches)", async () => {
    const res = await agent.get("/api/me");
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("ok", true);
    expect(res.body.user).to.be.an("object");
    expect(res.body.user.email).to.equal(TEST_EMAIL);
  });
});
