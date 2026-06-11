const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const integration = require("../controllers/integrationController");

const router = express.Router();
router.use(requireAuth);

router.get("/nouveaux", asyncHandler(integration.list));
router.post("/nouveaux", asyncHandler(integration.register));
router.get("/nouveaux/:id", asyncHandler(integration.getOne));
router.post("/nouveaux/:id/valider", asyncHandler(integration.validate));
router.post("/nouveaux/:id/promouvoir", asyncHandler(integration.promote));

module.exports = router;
