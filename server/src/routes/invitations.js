const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const invitations = require("../controllers/invitationsController");

const router = express.Router();

// Admin (Pasteur/PR) — manage invitations.
router.post("/", requireAuth, requireRole("pasteur", "pr"), asyncHandler(invitations.create));
router.get("/", requireAuth, requireRole("pasteur", "pr"), asyncHandler(invitations.list));
router.delete("/:id", requireAuth, requireRole("pasteur", "pr"), asyncHandler(invitations.revoke));

// Public — the invited person hasn't got an account yet.
router.get("/token/:token", asyncHandler(invitations.getByToken));
router.post("/token/:token/accept", asyncHandler(invitations.accept));

module.exports = router;