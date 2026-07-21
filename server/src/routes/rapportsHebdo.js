const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rh = require("../controllers/rapportsHebdoController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(rh.list));
router.get("/:id", asyncHandler(rh.getOne));
router.get("/:id/pdf", asyncHandler(rh.pdf));
router.post("/", asyncHandler(rh.create));
router.put("/:id", asyncHandler(rh.update));
router.delete("/:id", asyncHandler(rh.remove));

module.exports = router;