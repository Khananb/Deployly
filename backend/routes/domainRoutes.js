const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { addDomain, getDomains, updateDomain, deleteDomain } = require("../controllers/domainController");

const { enforceLimit } = require("../middleware/planEnforcer");

const router = express.Router();

router.post("/", verifyToken, enforceLimit('domain'), addDomain);
router.get("/", verifyToken, getDomains);
router.put("/:id", verifyToken, updateDomain);
router.delete("/:id", verifyToken, deleteDomain);

module.exports = router;
