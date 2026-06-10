const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const reports = require("../controllers/reportsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(reports.list));
router.get("/aggregate", asyncHandler(reports.aggregate));
router.get("/:id", asyncHandler(reports.getOne));
router.post("/", asyncHandler(reports.create));
router.put("/:id", asyncHandler(reports.update));
router.post("/:id/transmit", asyncHandler(reports.transmit));
router.delete("/:id", asyncHandler(reports.remove));

module.exports = router;
