const express = require("express");
const { getFounderStock } = require("../controllers/planController");

const router = express.Router();

router.get("/founder", getFounderStock);

module.exports = router;
