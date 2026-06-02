const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const departments = require("../controllers/departmentsController");

const router = express.Router();

router.use(requireAuth);
router.get("/", asyncHandler(departments.list));

module.exports = router;
