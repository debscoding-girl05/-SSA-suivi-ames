const express = require("express");
const authRoutes = require("./auth");
const dirigeantsRoutes = require("./dirigeants");
const rapportsRoutes = require("./rapports");
const departmentsRoutes = require("./departments");
const annuaireRoutes = require("./annuaire");
const reportsRoutes = require("./reports");
const integrationRoutes = require("./integration");
const notificationsRoutes = require("./notifications");
const objectifRoutes = require("./objectif");
const cellulesRoutes = require("./cellules");

// API router mounted under /api. /health is mounted at the app root.
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dirigeants", dirigeantsRoutes);
router.use("/rapports", rapportsRoutes);
router.use("/departments", departmentsRoutes);
router.use("/annuaire", annuaireRoutes);
router.use("/reports", reportsRoutes);
router.use("/integration", integrationRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/objectif", objectifRoutes);
router.use("/cellules", cellulesRoutes);

module.exports = router;
