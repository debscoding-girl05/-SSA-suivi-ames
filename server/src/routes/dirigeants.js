const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const dirigeants = require("../controllers/dirigeantsController");
const assignes = require("../controllers/assignesController");

const router = express.Router();
router.use(requireAuth);

// Dirigeants
router.get("/", asyncHandler(dirigeants.list));
router.post("/", requireRole("pasteur", "pr"), asyncHandler(dirigeants.create));
router.get("/:id", asyncHandler(dirigeants.getOne));
router.put("/:id", requireRole("pasteur", "pr"), asyncHandler(dirigeants.update));

// Assignés nested under a dirigeant (write-permission checked in controller).
router.get("/:id/assignes", asyncHandler(assignes.list));
router.post("/:id/assignes", asyncHandler(assignes.create));
router.put("/:id/assignes/:assigneId", asyncHandler(assignes.update));
router.delete("/:id/assignes/:assigneId", asyncHandler(assignes.remove));

module.exports = router;
