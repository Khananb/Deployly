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
        // Transition to validating
        await deploymentService.updateDeploymentStatus(deploymentId, 'validating');
        await deploymentService.addDeploymentLog(deploymentId, "Validation", "validating", "Running security scans and ZIP validation");

        // Extract
        await ZipService.validateAndExtract(uploadPath, extractPath);

        // Extraction Success
        await deploymentService.addDeploymentLog(deploymentId, "Validation", "success", "Validation passed");
        await deploymentService.addDeploymentLog(deploymentId, "Extraction", "success", "Extraction completed");
        
        // Detect Project
        await deploymentService.addDeploymentLog(deploymentId, "Detection", "pending", "Project detection started");
        const detectionResult = ProjectDetector.detectProject(extractPath);
        
        await deploymentService.updateDeploymentMetadata(deploymentId, detectionResult.projectType, detectionResult.framework);
        const updateData = {};
        if (detectionResult.projectType !== 'unknown') {
            updateData.type = detectionResult.projectType;
        }
        if (Object.keys(updateData).length > 0) {
            await websiteService.updateWebsiteDeploymentData(websiteId, updateData);
        }
        await deploymentService.addDeploymentLog(deploymentId, "Detection", "success", `Project detected: ${detectionResult.framework}`);

        // Project Validation
        await deploymentService.addDeploymentLog(deploymentId, "Project Validation", "pending", "Validating project structure");
        const hasFile = (filename) => fs.existsSync(path.join(extractPath, filename));
        
        switch (detectionResult.projectType) {
            case 'static':
                if (!hasFile('index.html')) throw new Error("A valid static website must contain index.html at the root.");
                break;
            case 'node':
                if (!hasFile('package.json')) throw new Error("A Node.js project must contain package.json at the root.");
                break;
            case 'php':
                if (!hasFile('index.php') && !hasFile('composer.json')) throw new Error("A PHP project must contain index.php or composer.json at the root.");
                break;
            case 'wordpress':
                if (!hasFile('wp-config.php') && !fs.existsSync(path.join(extractPath, 'wp-content'))) throw new Error("A WordPress project must contain wp-config.php or wp-content at the root.");
                break;
        }
        await deploymentService.addDeploymentLog(deploymentId, "Project Validation", "success", "Project validation passed");

        // Mark Ready
        await deploymentService.updateDeploymentStatus(deploymentId, 'ready');
        await deploymentService.updateDeploymentPaths(deploymentId, uploadPath, extractPath);
        await deploymentService.addDeploymentLog(deploymentId, "Deployment", "ready", "Ready for deployment");

        // Auto-Deploy if engine is detected
        if (detectionResult.projectType !== 'unknown') {
            await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", `Auto-deploying as ${detectionResult.projectType}`);
            await deploymentService.updateDeploymentStatus(deploymentId, 'deploying');
            
            // Fire and forget background deployment
            (async () => {
                try {
                    let autoDeployResult;
                    if (detectionResult.projectType === 'node') {
                        const NodeDeploymentService = require("../services/nodeDeploymentService");
                        autoDeployResult = await NodeDeploymentService.deployNodeWebsite(userId, websiteId, deploymentId, extractPath);
                    } else if (detectionResult.projectType === 'static') {
                        const StaticDeploymentService = require("../services/staticDeploymentService");
                        autoDeployResult = await StaticDeploymentService.deployStaticWebsite(userId, websiteId, deploymentId, extractPath);
                    }

                    if (autoDeployResult) {
                        // Process Custom Domains & SSL before marking as deployed
                        const domainService = require("../services/domainService");
                        await domainService.processDomainsForWebsite(userId, websiteId, deploymentId).catch(console.error);
                        
                        await deploymentService.updateDeploymentStatus(deploymentId, 'deployed');
                    }
                } catch (deployErr) {
                    await deploymentService.updateDeploymentStatus(deploymentId, 'failed');
                    await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "failed", deployErr.message);
                }
            })();

            return sendSuccess(res, {
                success: true,
                status: 'deploying',
                deploymentId,
                message: "Deployment started."
            });
        } else {
            // Project type is unknown, require manual selection
            await deploymentService.updateDeploymentStatus(deploymentId, 'ready');
            await deploymentService.addDeploymentLog(deploymentId, "Detection", "warning", "Engine detection failed. Manual engine selection required.");
            
            return sendSuccess(res, {
                success: true,
                status: 'unknown_engine',
                deploymentId,
                message: "Engine detection failed. Please select engine manually."
            });
        }
    } catch (err) {
        // On failure
        await deploymentService.updateDeploymentStatus(deploymentId, 'failed');
        await deploymentService.addDeploymentLog(deploymentId, "Validation/Extraction", "failed", err.message);
        throw err;
    }
});

module.exports = {
    uploadWebsiteZip
};
