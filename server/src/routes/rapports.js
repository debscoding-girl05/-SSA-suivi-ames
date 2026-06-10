const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rapports = require("../controllers/rapportsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(rapports.weekOverview));
router.get("/me", asyncHandler(rapports.mine));
router.post("/", asyncHandler(rapports.submit));

module.exports = router;
