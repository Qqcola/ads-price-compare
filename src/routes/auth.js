const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// pages
router.get("/signup", authController.signupPage);
router.get("/login", authController.loginPage);
router.get("/home", authController.requireAuth, authController.homePage);

// actions
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/auth/logout", authController.logout);

// APIs used by the frontend
router.get("/api/me", authController.me);
router.get("/api/session", authController.sessionInfo);

module.exports = router;
