const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const deploymentService = require("../services/deploymentService");
const websiteService = require("../services/websiteService");

const fs = require("fs");
const path = require("path");
const extract = require("extract-zip");

const deployWebsite = asyncHandler(async (req, res) => {
    const { id: websiteId } = req.params;
    const userId = req.user.id;
    const { deploymentId } = req.body;

    if (!deploymentId) {
        const err = new Error("deploymentId is required");
        err.statusCode = 400;
        throw err;
    }

    // Verify ownership
    const website = await websiteService.getWebsiteById(userId, websiteId);

    // Verify deployment ownership and status
    const deployment = await deploymentService.getDeploymentById(deploymentId);
    if (!deployment || deployment.website_id !== Number(websiteId)) {
        const err = new Error("Invalid deployment ID");
        err.statusCode = 400;
        throw err;
    }

    if (deployment.status === 'deploying') {
        const err = new Error("Deployment is already in progress");
        err.statusCode = 409;
        throw err;
    }
    
    if (deployment.status !== 'ready') {
        const err = new Error("Deployment must be in 'ready' status to deploy");
        err.statusCode = 400;
        throw err;
    }

    const extractPath = deployment.extract_path || path.join(__dirname, "../../storage/sites", String(userId), String(websiteId));
    if (!fs.existsSync(extractPath)) {
        await deploymentService.updateDeploymentStatus(deploymentId, 'failed');
        await websiteService.updateWebsite(userId, websiteId, website.name, 'failed');
        throw new Error("Extracted source files not found. Upload may have failed.");
    }

    let result;
    if (deployment.project_type === 'node' || website.type === 'node') {
        // Call Node.js deployment service
        const NodeDeploymentService = require("../services/nodeDeploymentService");
        result = await NodeDeploymentService.deployNodeWebsite(userId, websiteId, deploymentId, extractPath);
    } else if (deployment.project_type === 'static' || deployment.project_type === 'unknown' || website.type === 'static') {
        // Call static deployment service
        const StaticDeploymentService = require("../services/staticDeploymentService");
        result = await StaticDeploymentService.deployStaticWebsite(userId, websiteId, deploymentId, extractPath);
    } else {
        const err = new Error(`Deployment engine for ${deployment.project_type} is not yet implemented.`);
        err.statusCode = 400;
        throw err;
    }

    if (result && result.success) {
        // Asynchronously process custom domains & SSL after successful deployment
        const domainService = require("../services/domainService");
        domainService.processDomainsForWebsite(userId, websiteId, deploymentId).catch(console.error);
    }

    sendSuccess(res, {
        deploymentStatus: result.deploymentStatus,
        deploymentUrl: result.deploymentUrl
    }, "Deployment process completed successfully");
});

const getDeployments = asyncHandler(async (req, res) => {
    const { id: websiteId } = req.params;
    await websiteService.getWebsiteById(req.user.id, websiteId); // verify ownership
    const deployments = await deploymentService.getDeployments(websiteId);
    sendSuccess(res, { deployments }, "Deployments fetched");
});

const getDeploymentLogs = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const logs = await deploymentService.getDeploymentLogs(deploymentId);
    sendSuccess(res, { logs }, "Logs fetched");
});

module.exports = {
    deployWebsite,
    getDeployments,
    getDeploymentLogs
};
