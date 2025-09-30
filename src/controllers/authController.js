const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const User = require("../models/user");

const ACCESS_TOKEN_TTL  = process.env.ACCESS_TOKEN_TTL  || "1m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "1d";
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "dev_access_secret_change_me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me";
const isProd = process.env.NODE_ENV === "production";

const PUBLIC_DIR = path.resolve(__dirname, "../../public");

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 1000, // 1 minute (just for checking purpose only)
    path: "/",
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: "/",
  });
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, fn: user.firstName },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user, jti) {
  return jwt.sign(
    { sub: user._id.toString(), jti },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function newJti() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
}

/* ---------------- Pages (static files) ---------------- */
exports.signupPage = (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "signup.html"));
exports.loginPage  = (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html"));
exports.homePage   = (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "home.html"));

/* ---------------- Actions ---------------- */
exports.signup = async (req, res) => {
  try {
    const clean = (s) => (s || "").trim();
    const email = clean(req.body.email).toLowerCase();
    const password = req.body.password || "";
    const firstName = clean(req.body.firstName);
    const lastName  = clean(req.body.lastName);

    if (!firstName || !lastName || !email || !password)
      return res.status(400).send("All fields required.");

    const existing = await User.findOne({ $or: [{ email }, { name: email }] });
    if (existing) return res.status(409).send("User already exists. Please login.");

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      firstName, lastName, email, name: email, password: hashedPassword,
      refreshTokenId: null
    });

    return res.redirect("/login.html");
  } catch (_err) {
    return res.status(500).send("Internal server error during signup.");
  }
};

exports.login = async (req, res) => {
  try {
    const email = (req.body.email || req.body.username || "").trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email }, { name: email }] });
    if (!user) return res.status(404).send("User not found.");

    const isMatch = await bcrypt.compare(req.body.password || "", user.password);
    if (!isMatch) return res.status(401).send("Wrong password.");

    const jti = newJti();
    user.refreshTokenId = jti;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.redirect("/main_page.html");
  } catch (_err) {
    return res.status(500).send("Internal server error during login.");
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_SECRET);
        await User.findByIdAndUpdate(payload.sub, { $set: { refreshTokenId: null } });
      } catch {}
    }
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("sid", { path: "/" });
    return res.redirect("/login.html");
  } catch {
    return res.redirect("/login.html");
  }
};

exports.requireAuth = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.redirect("/login.html");
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.redirect("/login.html");
  }
};

// Return session info (jti) by decoding the refresh token cookie
exports.sessionInfo = (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(200).json({ ok: false, jti: null });
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    return res.status(200).json({ ok: true, jti: payload.jti || null });
  } catch {
    return res.status(200).json({ ok: false, jti: null });
  }
};

/* -------- API for home.js -------- */
exports.me = async (req, res) => {
  try {
    let fullName = "User";
    let email = null;
    let jti = null;

    const token = req.cookies?.accessToken;
    if (token) {
      try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const me = await User.findById(payload.sub)
          .select("firstName lastName email refreshTokenId")
          .lean();

        if (me) {
          const first = me.firstName?.trim() || "";
          const last  = me.lastName?.trim()  || "";
          const merged = `${first} ${last}`.trim();
          fullName = merged || first || "User";
          email    = me.email || null;
          jti      = me.refreshTokenId || null;
        }
      } catch (_) {
        // ignore; will send defaults
      }
    }

    return res.json({
      ok: true,
      user: { fullName, email, jti }
    });
  } catch {
    return res.status(500).json({ ok: false, error: "server-error" });
  }
};
