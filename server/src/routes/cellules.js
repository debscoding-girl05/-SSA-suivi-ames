const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const cellules = require("../controllers/cellulesController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(cellules.list));
router.post("/", asyncHandler(cellules.create));
router.get("/:id", asyncHandler(cellules.getOne));
router.put("/:id", asyncHandler(cellules.update));
router.delete("/:id", asyncHandler(cellules.remove));
router.get("/:id/fiche", asyncHandler(cellules.getFiche));
router.post("/:id/fiche", asyncHandler(cellules.submitFiche));
router.post("/:id/fiche/:ficheId/validate", asyncHandler(cellules.validateFiche));

module.exports = router;