const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../utils/multerConfig");
const { createWebsite, getWebsites, getWebsiteById, updateWebsite, deleteWebsite, restartWebsite, stopWebsite } = require("../controllers/websiteController");
const { uploadWebsiteZip, deployWebsite, getDeployments } = require("../controllers/deploymentController");

const router = express.Router();

router.post("/", verifyToken, createWebsite);
router.get("/", verifyToken, getWebsites);
router.get("/:id", verifyToken, getWebsiteById);
router.put("/:id", verifyToken, updateWebsite);
router.delete("/:id", verifyToken, deleteWebsite);
router.post("/:id/restart", verifyToken, restartWebsite);
router.post("/:id/stop", verifyToken, stopWebsite);
router.post("/:id/upload", verifyToken, upload.single("zipFile"), uploadWebsiteZip);
router.post("/:id/deploy", verifyToken, deployWebsite);
router.get("/:id/deployments", verifyToken, getDeployments);

module.exports = router;
