// src/server.js
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const collection = require("./config"); 
const app = express();
const PORT = process.env.PORT || 3000;
const crypto = require("crypto");
const { promisify } = require("util");
const randomBytesAsync = promisify(crypto.randomBytes);

const ROOT_DIR = path.join(__dirname, "..");
const VIEWS_DIR = path.join(ROOT_DIR, "views");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

/* -------------------- Middleware & static -------------------- */
app.set("view engine", "ejs");
app.set("views", VIEWS_DIR);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // serves /style.css, /images, etc.

/* -------------------- Page routes (GET) -------------------- */
app.get("/", (_req, res) => res.redirect("/login"));
app.get("/login", (_req, res) => res.render("login"));
app.get("/signup", (_req, res) => res.render("signup"));
app.get("/home", (_req, res) => res.render("home")); 

/* -------------------- Auth handlers (POST) -------------------- */
// Register user
app.post("/signup", async (req, res) => {
  try {
    const clean = (s) => (s || "").trim();

    const username  = clean(req.body.username).replace(/,+$/, "");
    const password  = req.body.password || "";
    const firstName = clean(req.body.firstName);
    const lastName  = clean(req.body.lastName);

    // Validate required fields
    if (!firstName) {
      return res.status(400).send("First name is required.");
    }
    if (!lastName) {
      return res.status(400).send("Last name is required.");
    }
    if (!username || !password) {
      return res.status(400).send("Email and password are required.");
    }

    const existingUser = await collection.findOne({ name: username });
    if (existingUser) {
      return res.status(409).send("User already exists. Please choose a different email.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await collection.create({
      name: username,
      password: hashedPassword,
      firstName,
      lastName,
    });

    return res.redirect("/login");
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).send("Internal server error during signup.");
  }
});


// Login user
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await collection.findOne({ name: username });
    if (!user) return res.status(404).send("User name not found.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send("Wrong password.");

    // Success
    return res.render("home");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal server error during login.");
  }
});

/* -------------------- 404 fallback -------------------- */
app.use((_req, res) => res.status(404).send("Not found"));

/* -------------------- Start server -------------------- */
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
