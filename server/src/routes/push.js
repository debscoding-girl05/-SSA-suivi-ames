const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const push = require("../controllers/pushController");

const router = express.Router();

router.get("/public-key", asyncHandler(push.publicKey));
router.post("/subscribe", requireAuth, asyncHandler(push.subscribe));
router.post("/unsubscribe", requireAuth, asyncHandler(push.unsubscribe));

module.exports = router;
