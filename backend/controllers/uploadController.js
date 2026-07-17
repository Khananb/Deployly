const fs = require("fs");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const deploymentService = require("../services/deploymentService");
const websiteService = require("../services/websiteService");
const ZipService = require("../services/zipService");
const ProjectDetector = require("../services/projectDetector");

const uploadWebsiteZip = asyncHandler(async (req, res) => {
    const { id: websiteId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
        const err = new Error("No file uploaded or invalid file format");
        err.statusCode = 400;
        throw err;
    }

    // Verify ownership
    const website = await websiteService.getWebsiteById(userId, websiteId);

    // Check active deployments
    const activeDeployments = await deploymentService.getActiveDeployments(websiteId);
    if (activeDeployments.length > 0) {
        const err = new Error("A deployment is currently in progress for this website");
        err.statusCode = 409;
        throw err;
    }

    // Create deployment record
    const deploymentId = await deploymentService.createDeployment(websiteId, req.file.filename);
    await deploymentService.addDeploymentLog(deploymentId, "ZIP Upload", "uploaded", "File uploaded successfully");

    const uploadPath = path.join(__dirname, "../../storage/uploads", String(userId), String(websiteId), req.file.filename);
    const extractPath = path.join(__dirname, "../../storage/sites", String(userId), String(websiteId));

    try {
        // Enqueue deployment job
        const { deploymentQueue } = require('../queue/deploymentQueue');
        await deploymentQueue.add('deploy', {
            deploymentId,
            websiteId,
            userId,
            uploadPath,
            extractPath
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });

        // Set status to PENDING
        await deploymentService.updateDeploymentStatus(deploymentId, 'PENDING');
        await deploymentService.updateDeploymentPaths(deploymentId, uploadPath, extractPath);

        return sendSuccess(res, {
            success: true,
            status: 'PENDING',
            deploymentId,
            message: "Deployment queued."
        });
    } catch (err) {
        await deploymentService.updateDeploymentStatus(deploymentId, 'FAILED');
        await deploymentService.addDeploymentLog(deploymentId, "Queue", "failed", err.message);
        throw err;
    }
});

module.exports = {
    uploadWebsiteZip
};
