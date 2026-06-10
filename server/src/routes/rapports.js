const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rapports = require("../controllers/rapportsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(rapports.weekOverview));
router.get("/me", asyncHandler(rapports.mine));
router.get("/fiche/:dirigeantId", asyncHandler(rapports.getFiche));
router.post("/", asyncHandler(rapports.submit));
router.post("/:id/validate", asyncHandler(rapports.validate));
router.post("/:id/request-changes", asyncHandler(rapports.requestChanges));

module.exports = router;
