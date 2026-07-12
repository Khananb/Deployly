const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { getDeploymentLogs } = require("../controllers/deploymentController");

const router = express.Router();

router.get("/:deploymentId/logs", verifyToken, getDeploymentLogs);

module.exports = router;
