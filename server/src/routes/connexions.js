const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const connexions = require("../controllers/connexionsController");

const router = express.Router();
// Journal de connexions — Pasteur/PR uniquement (EF-08).
router.use(requireAuth, requireRole("pasteur", "pr"));

router.get("/", asyncHandler(connexions.list));

module.exports = router;