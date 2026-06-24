const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const objectif = require("../controllers/objectifController");

const router = express.Router();
// Objectif d'évangélisation : visible et modifiable uniquement par le Pasteur.
router.use(requireAuth, requireRole("pasteur"));

router.get("/", asyncHandler(objectif.get));
router.put("/", asyncHandler(objectif.set));

module.exports = router;
