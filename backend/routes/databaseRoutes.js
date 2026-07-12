const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { createDatabase, getDatabases, deleteDatabase } = require("../controllers/databaseController");

const router = express.Router();

router.post("/", verifyToken, createDatabase);
router.get("/", verifyToken, getDatabases);
router.delete("/:id", verifyToken, deleteDatabase);

module.exports = router;
