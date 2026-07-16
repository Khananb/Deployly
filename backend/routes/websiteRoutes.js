const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../utils/multerConfig");
const { createWebsite, getWebsites, getWebsiteById, updateWebsite, deleteWebsite, restartWebsite, stopWebsite } = require("../controllers/websiteController");
const { uploadWebsiteZip } = require("../controllers/uploadController");
const { getProjectDetection } = require("../controllers/projectController");
const { deployWebsite, getDeployments } = require("../controllers/deploymentController");

const { enforceLimit } = require("../middleware/planEnforcer");

const router = express.Router();

router.post("/", verifyToken, enforceLimit('website'), createWebsite);
router.get("/", verifyToken, getWebsites);
router.get("/:id", verifyToken, getWebsiteById);
router.patch("/:id", verifyToken, updateWebsite);
router.delete("/:id", verifyToken, deleteWebsite);
router.post("/:id/restart", verifyToken, restartWebsite);
router.post("/:id/stop", verifyToken, stopWebsite);
router.post("/:id/upload", verifyToken, upload.single("zipFile"), uploadWebsiteZip);
router.get("/:id/detection", verifyToken, getProjectDetection);
router.post("/:id/deploy", verifyToken, deployWebsite);
router.get("/:id/deployments", verifyToken, getDeployments);

module.exports = router;
