const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { getDashboardSummary } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", verifyToken, getDashboardSummary);

module.exports = router;
