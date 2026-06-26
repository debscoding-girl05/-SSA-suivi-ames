const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const departments = require("../controllers/departmentsController");

const router = express.Router();

router.use(requireAuth);
router.get("/overview", asyncHandler(departments.overview));
router.get("/", asyncHandler(departments.list));
router.post("/", requireRole("pasteur", "pr"), asyncHandler(departments.create));
router.put("/:id", requireRole("pasteur", "pr"), asyncHandler(departments.update));

module.exports = router;
