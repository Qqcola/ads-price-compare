const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { startServer, stopServer } = require("./setup");

const HEADED = process.env.HEADED === "1";
const SLOWMO = Number(process.env.SLOWMO || 500);
const DEBUG_E2E = process.env.DEBUG_E2E === "1";

let baseURL, browser, page;
let goodEmail, goodPassword;

describe("E2E: full flow of ADS", function () {
  this.timeout(150_000);
  this.retries(0);

  before(async () => {
    const started = await startServer();
    baseURL = started.baseURL;

    browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO });
    page = await browser.newPage();

    if (DEBUG_E2E) {
      page.on("console", (msg) =>
        console.log("[browser]", msg.type(), msg.text())
      );
      page.on("pageerror", (err) => console.error("[pageerror]", err));
      page.on("response", (res) => {
        const url = res.url();
        if (url.startsWith(baseURL + "/api/")) {
          console.log("[api]", res.status(), url.replace(baseURL, ""));
        }
      });
    }
  });

  after(async () => {
    await browser?.close();
    await stopServer();
  });

  afterEach(async function () {
    if (this.currentTest?.state === "failed" && page) {
      const dir = path.join(process.cwd(), "test-artifacts");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(
        dir,
        `FAILED_${Date.now()}_${this.currentTest.title.replace(
          /\s+/g,
          "_"
        )}.png`
      );
      await page.screenshot({ path: file, fullPage: true });
      console.log("❌ Saved failure screenshot:", file);
    }
  });

  // --- Helpers -----
  async function doSignupAttempt(
    email,
    password,
    first = "Christo",
    last = "Raju"
  ) {
    await page.goto(`${baseURL}/signup.html`, {
      waitUntil: "domcontentloaded",
    });
    await page.fill("#firstName", first);
    await page.fill("#lastName", last);
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click("#signupSubmit");

    // Waiting for either redirect or duplicate banner
    await Promise.race([
      page.waitForURL(/\/login\.html$/, { timeout: 10_000 }),
      page.waitForSelector("#signup-msg", { timeout: 10_000 }),
    ]);

    // If not on login yet, handle duplicate
    if (!/\/login\.html$/.test(page.url())) {
      const msg = await page
        .locator("#signup-msg")
        .innerText()
        .catch(() => "");
      if (/already exists/i.test(msg)) {
        await page.click('a[href="login.html"]');
        await page.waitForURL(/\/login\.html$/);
        return "exists";
      }
    }
    return "ok";
  }

  // Convenience wrapper that guarantees we end on /login.html
  async function doSignupToLogin(email, password, first, last) {
    const outcome = await doSignupAttempt(email, password, first, last);
    return outcome;
  }

  async function doLogin(email, password) {
    await page.goto(`${baseURL}/login.html`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button:has-text("Sign In")');
  }

  // for /api/me
  async function waitForMeEmail(expectedEmail) {
    const tries = 6;
    for (let i = 0; i < tries; i++) {
      const me = await page.evaluate(async () => {
        const r = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });
        return r.json();
      });
      if (me && me.ok && me.user && me.user.email) {
        if (DEBUG_E2E) console.log("[me]", me.user);
        if (me.user.email === expectedEmail) return me.user;
      }
      await page.waitForTimeout(500);
    }
    const finalMe = await page.evaluate(async () => {
      const r = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      return r.json();
    });
    assert.strictEqual(
      finalMe?.user?.email || null,
      expectedEmail,
      "email should match"
    );
    return finalMe.user;
  }

  async function browserLogSession() {
    // Session info
    await page.evaluate(async () => {
      const r = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      const d = await r.json().catch(() => ({}));
      console.log("[session]", {
        fullName: d?.user?.fullName,
        email: d?.user?.email,
        jti: d?.user?.jti,
      });
    });
  }

  // E-2-E flow starts here

  it("1) Signup → Login → land on index and verify session (then logout)", async () => {
    goodEmail = `christoraju085${Date.now()}@gmail.com`;
    goodPassword = "Christo@123";

    // signup: works whether user is new or already exists; ends on /login.html
    await doSignupToLogin(goodEmail, goodPassword);

    // Login
    await doLogin(goodEmail, goodPassword);
    await page.waitForURL(/\/index\.html$/);

    // Confirm UI & session
    const logoutVisible = await page.isVisible(
      'form[action="/auth/logout"] button'
    );
    assert.strictEqual(logoutVisible, true, "Logout button should be visible");

    await waitForMeEmail(goodEmail);
    await browserLogSession();
    await page.waitForTimeout(800);

    // Logout to start negative auth scenarios
    await page.click('form[action="/auth/logout"] button');
    await page.waitForURL(/\/login\.html$/);
  });

  it("2) Negative auth: duplicate signup, wrong user, wrong password, then login again with original", async () => {
    // Duplicate signup (same email)
    await doSignupAttempt(goodEmail, goodPassword);

    // Wrong user
    const bogus = `christoraju08${Date.now()}@gmail.com`;
    await doLogin(bogus, "whatever");
    const nfBanner = page.locator("#loginError");
    await nfBanner.waitFor({ state: "visible" });
    assert.match(await nfBanner.innerText(), /not found/i);

    // Wrong password
    await doLogin(goodEmail, "Christo@12");
    const wrongBanner = page.locator("#loginError");
    await wrongBanner.waitFor({ state: "visible" });
    assert.match(await wrongBanner.innerText(), /wrong password/i);

    // Finally, login with the real user credentials to continue the flow
    await doLogin(goodEmail, goodPassword);
    await page.waitForURL(/\/index\.html$/);
    await waitForMeEmail(goodEmail);
    await browserLogSession();

    await page.waitForTimeout(600);
  });

  it("3) Main page: trending → save → My List → Item (optional) → back to index", async () => {
    await page.waitForSelector("#trending-grid .card", { timeout: 20_000 });

    // Save first trending item
    const firstSave = page.locator("#trending-grid .card .fav-add").first();
    await firstSave.click();

    // Go to My List
    await page.click('a[href="/list.html"]');
    await page.waitForURL(/\/list\.html$/);
    await page.waitForSelector("#list-collection li.collection-item");

    // Open first details if available, then return to index
    const firstDetails = page
      .locator('#list-collection a[href^="/item?id="]')
      .first();
    if (await firstDetails.count()) {
      await firstDetails.click();
      await page.waitForURL(/\/item\?id=/);

      // Try to assert the presence of key item-page sections
      try {
        await page.waitForSelector("#itemName", { timeout: 4000 });
        await page.waitForSelector("#accordion", { timeout: 4000 });
      } catch {
        /* item sections optional; ignore if missing */
      }

      await page.waitForTimeout(600);
      await page.click('a[href="/index.html"]');
      await page.waitForURL(/\/index\.html$/);
    }

    await page.waitForTimeout(600);
  });

  it("4) Search page: perform a search and save another item → back to index", async () => {
    await page.fill("#page-search-input", "vitamin");
    await page.click("#page-search-go");
    await page.waitForURL(/\/search\.html\?q=/);

    await page.waitForSelector("#results-grid .card", { timeout: 20_000 });

    const saveBtn = page.locator("#results-grid .card .fav-add").first();
    await saveBtn.click();

    await page.waitForTimeout(600);
    await page.click('a[href="/index.html"]');
    await page.waitForURL(/\/index\.html$/);
    await page.waitForTimeout(600);
  });

  it("5) Chatbot: home → create conversation → chat shell → (optional) bot reply", async () => {
    await page.click('a[href="/chat"]');
    await page.waitForURL(/\/chat(\/.*)?$/);

    await page.waitForSelector("#homeView", {
      state: "visible",
      timeout: 15_000,
    });

    await page.fill("#homeInput", "Hi, what’s a good multivitamin?");
    await page.click("#homeSend");

    await page.waitForSelector("#chatShell", {
      state: "visible",
      timeout: 15_000,
    });

    // user message visible
    await page.waitForSelector("#chatArea .message.me .body");

    // bot reply
    try {
      await page.waitForSelector("#chatArea .message:not(.me) .body", {
        timeout: 6000,
      });
    } catch {}

    await page.waitForTimeout(800);
  });

  it("6) Final logout → login.html and /api/me defaults", async () => {
    await page.click('a[href="/index.html"]');
    await page.waitForURL(/\/index\.html$/);

    await page.click('form[action="/auth/logout"] button');
    await page.waitForURL(/\/login\.html$/);

    const me = await page.evaluate(async () => {
      const r = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      return r.json();
    });
    assert.strictEqual(me.ok, true);
    assert.strictEqual(
      me.user?.email ?? null,
      null,
      "email should be null after logout"
    );

    await page.waitForTimeout(500);
  });
});
