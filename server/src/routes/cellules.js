const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const cellules = require("../controllers/cellulesController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(cellules.list));
router.get("/leaders", requireRole("pasteur", "pr"), asyncHandler(cellules.leaders));
router.post("/", requireRole("pasteur", "pr"), asyncHandler(cellules.create));
router.get("/:id", asyncHandler(cellules.getOne));
router.put("/:id", requireRole("pasteur", "pr"), asyncHandler(cellules.update));
router.post("/:id/membres", asyncHandler(cellules.addMembre));
router.delete("/:id/membres/:membreId", asyncHandler(cellules.removeMembre));
router.post("/:id/fiche", asyncHandler(cellules.submitFiche));

module.exports = router;
