const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const annuaire = require("../controllers/annuaireController");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(annuaire.list));

module.exports = router;
