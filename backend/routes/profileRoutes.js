const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { getProfile } = require("../controllers/profileController");

const router = express.Router();

router.get("/", verifyToken, getProfile);

module.exports = router;
