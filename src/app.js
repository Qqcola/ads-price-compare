// src/app.js
const express = require("express");
const path = require("path");

const app = express();

// Serve the frontend
app.use(express.static(path.join(__dirname, "../public")));
// (optional) also serve /docs so your PNGs in docs/ load:
app.use("/docs", express.static(path.join(__dirname, "../docs")));

// ...keep your existing middleware/routes here

module.exports = app;
