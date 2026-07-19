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

// POST /api/auth/forgot-password        — public (EF-06)
// POST /api/auth/reset-password/:token  — public (EF-06)
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password/:token", asyncHandler(authController.resetPassword));

module.exports = router;