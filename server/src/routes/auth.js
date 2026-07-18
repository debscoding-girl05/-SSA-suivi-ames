const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

// POST /api/auth/login   — public
router.post("/login", asyncHandler(authController.login));

// POST /api/auth/logout  — stateless
router.post("/logout", asyncHandler(authController.logout));

// GET  /api/auth/me      — protected
router.get("/me", requireAuth, asyncHandler(authController.me));

// POST /api/auth/change-password — protected (EF-04)
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));

module.exports = router;
