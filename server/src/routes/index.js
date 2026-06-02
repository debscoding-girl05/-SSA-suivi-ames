const express = require("express");
const authRoutes = require("./auth");
const membersRoutes = require("./members");
const departmentsRoutes = require("./departments");

// API router mounted under /api. /health is mounted at the app root.
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/members", membersRoutes);
router.use("/departments", departmentsRoutes);

module.exports = router;
