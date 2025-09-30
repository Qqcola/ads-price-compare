// src/index.js
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("./config");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = path.join(__dirname, "..");
const VIEWS_DIR = path.join(ROOT_DIR, "views");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

// ---------- Helpers ----------
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
const isProd = process.env.NODE_ENV === "production";

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 15 * 60 * 1000, path: "/" });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/auth" });
  if (process.env.DEBUG_SID_COOKIE === "1" && refreshToken) {
    try {
      const p = jwt.decode(refreshToken, { json: true });
      if (p?.jti) res.cookie("sid", p.jti, { httpOnly: false, secure: isProd, sameSite: "lax", maxAge: 7 * 864e5, path: "/" });
    } catch {}
  }
};

const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), email: user.email, fn: user.firstName }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const signRefreshToken = (user, jti) =>
  jwt.sign({ sub: user._id.toString(), jti }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

const newJti = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"));

const requireAuth = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.redirect(`/auth/refresh?returnTo=${encodeURIComponent(req.originalUrl)}`);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub; return next();
  } catch { return res.redirect(`/auth/refresh?returnTo=${encodeURIComponent(req.originalUrl)}`); }
};

const requireAdminKey = (req, res, next) => {
  const ok = req.query.key && req.query.key === process.env.ADMIN_KEY;
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------- App setup ----------
app.set("view engine", "ejs");
app.set("views", VIEWS_DIR);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

// expose current user to templates
app.use((req, res, next) => {
  const t = req.cookies?.accessToken;
  if (t) {
    try {
      const p = jwt.verify(t, process.env.JWT_ACCESS_SECRET);
      res.locals.currentUser = { id: p.sub, firstName: p.fn, email: p.email };
    } catch { res.locals.currentUser = null; }
  } else res.locals.currentUser = null;
  next();
});

// ---------- Views ----------
app.get("/", (_req, res) => res.redirect("/signup"));
app.get("/login", (_req, res) => res.render("login"));
app.get("/signup", (_req, res) => res.render("signup", { msg: null, msgType: null, values: { firstName: "", lastName: "", email: "" } }));
app.get("/auth", (req, res) => {
  const to = typeof req.query.returnTo === "string" ? req.query.returnTo : "/home";
  return res.redirect(`/auth/refresh?returnTo=${encodeURIComponent(to)}`);
});
app.get("/home", requireAuth, async (req, res) => {
  const me = await User.findById(req.userId).select("firstName refreshTokenId").lean();
  return res.render("home", { firstName: me?.firstName || "User", sessionId: me?.refreshTokenId || "(none)" });
});

// ---------- Debug / Admin ----------
app.get("/api/me", requireAuth, async (req, res) => {
  const me = await User.findById(req.userId).select("firstName lastName email refreshTokenId").lean();
  res.json({ ok: true, user: { id: me._id, ...me } });
});

app.get("/debug/cookies", (req, res) => {
  const access = req.cookies?.accessToken || null;
  const revealInProd = ["1","true","yes"].includes(String(req.query.reveal || "").toLowerCase());
  const reveal = !isProd || revealInProd;
  let accessPayload = null;
  if (reveal && access) { try { accessPayload = jwt.decode(access, { json: true }) || null; } catch {} }
  res.json({ hasAccessToken: Boolean(access), hasRefreshToken: Boolean(req.cookies?.refreshToken), refreshCookiePath: "/auth", ...(reveal ? { accessPayload } : {}) });
});

app.get("/auth/debug/cookies", (req, res) => {
  const access = req.cookies?.accessToken || null;
  const refresh = req.cookies?.refreshToken || null;
  const revealInProd = ["1","true","yes"].includes(String(req.query.reveal || "").toLowerCase());
  const reveal = !isProd || revealInProd;
  let refreshPayload = null;
  if (reveal && refresh) { try { refreshPayload = jwt.decode(refresh, { json: true }) || null; } catch {} }
  res.json({ hasAccessToken: Boolean(access), hasRefreshToken: Boolean(refresh), ...(reveal ? { refreshPayload } : {}) });
});

app.get("/admin/users", requireAdminKey, async (_req, res) => {
  const users = await User.find({}).select("email firstName lastName refreshTokenId").lean();
  res.json({ count: users.length, users });
});

// ---------- Serve item page ----------
app.get("/item", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "item.html"));
});

// ---------- API: item by id ----------
app.get("/api/itemById", async (req, res) => {
  try {
    const raw = (req.query.id || "").trim();
    if (!raw) return res.status(400).json({ error: "Missing id" });

    const collName = process.env.COLLECTION_ITEM_NAME || "items";
    const db = mongoose.connection?.db;
    if (!db) return res.status(500).json({ error: "DB not connected" });
    const coll = db.collection(collName);

    const { ObjectId } = mongoose.Types;
    const asNum = Number(raw);
    const candidates = [];

    // match by scraped id (number or string)
    if (!Number.isNaN(asNum)) candidates.push({ id: asNum });
    candidates.push({ id: raw });

    // match by Mongo _id if raw looks like an ObjectId
    if (ObjectId.isValid(raw)) candidates.push({ _id: new ObjectId(raw) });

    const item = await coll.findOne({ $or: candidates });
    if (!item) return res.status(404).json({ error: "Item not found" });

    // simple similar list (optional)
    let similarItems = [];
    try {
      if (item.name) {
        const prefix = String(item.name).split(/\s+/).slice(0, 2).join(" ");
        similarItems = await coll
          .find({ name: { $regex: `^${prefix}`, $options: "i" }, _id: { $ne: item._id } })
          .project({ _id: 1, id: 1, name: 1, img_url: 1, price: 1 })
          .limit(12)
          .toArray();
      }
    } catch {}

    res.json({ item, similarItems });
  } catch (err) {
    console.error("GET /api/itemById error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Auth: signup/login/refresh/logout ----------
app.post("/signup", async (req, res) => {
  try {
    const clean = (s) => (s || "").trim();
    const email     = clean(req.body.email).toLowerCase();
    const password  = req.body.password || "";
    const firstName = clean(req.body.firstName);
    const lastName  = clean(req.body.lastName);

    if (!firstName) return res.status(400).send("First name is required.");
    if (!lastName)  return res.status(400).send("Last name is required.");
    if (!email || !password) return res.status(400).send("Email and password are required.");

    const existingUser = await User.findOne({ $or: [{ email }, { name: email }] });
    if (existingUser) {
      return res.status(409).render("signup", {
        msg: "User already exists. Please login.",
        msgType: "error",
        values: { firstName, lastName, email },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, email, name: email, password: hashedPassword, refreshTokenId: null });
    return res.redirect("/login");
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).send("Internal server error during signup.");
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || req.body.username || "").trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email }, { name: email }] });
    if (!user) {
      return res.status(404).render("login", { msg: "User not found.", msgType: "error", values: { username: email } });
    }

    const isMatch = await bcrypt.compare(req.body.password || "", user.password);
    if (!isMatch) {
      return res.status(401).render("login", { msg: "Wrong password.", msgType: "error", values: { username: email } });
    }

    const jti = newJti();
    user.refreshTokenId = jti;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.redirect("/home");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal server error during login.");
  }
});

// Refresh (GET)
app.get("/auth/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.redirect("/login");

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenId !== payload.jti) return res.redirect("/login");

    const jti = newJti();
    user.refreshTokenId = jti;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);
    setAuthCookies(res, { accessToken, refreshToken });

    const nextUrl = req.query.returnTo || "/home";
    return res.redirect(nextUrl);
  } catch { return res.redirect("/login"); }
});

// Refresh (POST)
app.post("/auth/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "Missing refresh token" });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenId || user.refreshTokenId !== payload.jti) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const jti = newJti();
    user.refreshTokenId = jti;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Could not refresh" });
  }
});

// Logout
app.post("/auth/logout", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(payload.sub, { $set: { refreshTokenId: null } });
      } catch {}
    }
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/auth" });
    res.clearCookie("sid", { path: "/" });
    return res.redirect("/login");
  } catch (err) {
    console.error("Logout error:", err);
    return res.redirect("/login");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
