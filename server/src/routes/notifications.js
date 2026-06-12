const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const notifications = require("../controllers/notificationsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(notifications.list));
router.post("/read-all", asyncHandler(notifications.markAllRead));
router.post("/:id/read", asyncHandler(notifications.markRead));

module.exports = router;
