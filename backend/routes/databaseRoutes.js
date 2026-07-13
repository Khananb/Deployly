const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { createDatabase, getDatabases, deleteDatabase } = require("../controllers/databaseController");

const { enforceLimit } = require("../middleware/planEnforcer");

const router = express.Router();

router.post("/", verifyToken, enforceLimit('mysql'), createDatabase);
router.get("/", verifyToken, getDatabases);
router.delete("/:id", verifyToken, deleteDatabase);

module.exports = router;
