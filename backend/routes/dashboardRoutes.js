const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { getDashboardSummary, getUsage } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", verifyToken, getDashboardSummary);
router.get("/usage", verifyToken, getUsage);

module.exports = router;
