const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const websiteService = require("../services/websiteService");
const deploymentService = require("../services/deploymentService");

const getProjectDetection = asyncHandler(async (req, res) => {
    const { id: websiteId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const website = await websiteService.getWebsiteById(userId, websiteId);

    // Get latest deployment to find detection data
    const deployments = await deploymentService.getDeployments(websiteId);
    if (deployments.length === 0) {
        const err = new Error("No deployments found for this website");
        err.statusCode = 404;
        throw err;
    }

    const latestDeployment = deployments[0];
    // Need to fetch full details to get project_type, framework, detected_at because getDeployments only returns id, filename, status, created_at
    const [rows] = await require("../config/db").execute(
        "SELECT project_type, framework, detected_at, status FROM deployments WHERE id = ?",
        [latestDeployment.id]
    );

    if (rows.length === 0) {
        const err = new Error("Deployment details not found");
        err.statusCode = 404;
        throw err;
    }

    const deploymentDetails = rows[0];

    // If still in process of detecting or uploaded but not detected
    if (!deploymentDetails.project_type && deploymentDetails.status !== 'ready' && deploymentDetails.status !== 'deployed' && deploymentDetails.status !== 'failed') {
        const err = new Error("Project detection has not completed yet");
        err.statusCode = 400;
        throw err;
    }

    sendSuccess(res, {
        projectType: deploymentDetails.project_type || website.type,
        framework: deploymentDetails.framework,
        detectedAt: deploymentDetails.detected_at,
        ready: !!deploymentDetails.project_type
    }, "Project detection fetched successfully");
});

module.exports = {
    getProjectDetection
};
