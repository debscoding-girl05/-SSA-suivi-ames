const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const members = require("../controllers/membersController");

const router = express.Router();

// All member routes require authentication.
router.use(requireAuth);

router.get("/", asyncHandler(members.list));
router.get("/:id", asyncHandler(members.getOne));

// Writes are restricted by role (RBAC).
router.post("/", requireRole("admin", "leader"), asyncHandler(members.create));
router.put("/:id", requireRole("admin", "leader"), asyncHandler(members.update));
router.delete("/:id", requireRole("admin"), asyncHandler(members.remove));

module.exports = router;
