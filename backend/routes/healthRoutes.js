const express = require("express");
const { getHealthStatus, getDoctorStatus } = require("../controllers/healthController");

const router = express.Router();

router.get("/", getHealthStatus);
router.get("/doctor", getDoctorStatus);

module.exports = router;
