const express = require("express");
const authRoutes = require("./auth");
const dirigeantsRoutes = require("./dirigeants");
const rapportsRoutes = require("./rapports");
const cellulesRoutes = require("./cellules");
const departmentsRoutes = require("./departments");
const annuaireRoutes = require("./annuaire");
const reportsRoutes = require("./reports");
const integrationRoutes = require("./integration");
const notificationsRoutes = require("./notifications");
const invitationsRoutes = require("./invitations");
const objectifRoutes = require("./objectif");

// API router mounted under /api. /health is mounted at the app root.
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dirigeants", dirigeantsRoutes);
router.use("/rapports", rapportsRoutes);
router.use("/cellules", cellulesRoutes);
router.use("/departments", departmentsRoutes);
router.use("/annuaire", annuaireRoutes);
router.use("/reports", reportsRoutes);
router.use("/integration", integrationRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/invitations", invitationsRoutes);
router.use("/objectif", objectifRoutes);

module.exports = router;