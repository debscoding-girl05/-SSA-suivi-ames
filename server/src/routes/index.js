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
const connexionsRoutes = require("./connexions");
const rapportsHebdoRoutes = require("./rapportsHebdo");
const pushRoutes = require("./push");

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
router.use("/connexions", connexionsRoutes);
router.use("/rapports-hebdo", rapportsHebdoRoutes);
router.use("/push", pushRoutes);

module.exports = router;