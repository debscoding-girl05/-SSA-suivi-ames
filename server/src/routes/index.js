const express = require("express");
const authRoutes = require("./auth");

// API router mounted under /api. /health is mounted at the app root.
const router = express.Router();

router.use("/auth", authRoutes);

module.exports = router;
