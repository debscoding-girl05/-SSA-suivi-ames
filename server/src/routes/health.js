const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const db = require("../db");

const router = express.Router();

// GET /health — liveness + DB backend status.
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const database = await db.healthcheck();
    // Surface DB outages to readiness/liveness probes via 503.
    const status = database.ok ? "ok" : "degraded";
    res.status(database.ok ? 200 : 503).json({
      status,
      uptime: process.uptime(),
      database,
    });
  })
);

module.exports = router;
