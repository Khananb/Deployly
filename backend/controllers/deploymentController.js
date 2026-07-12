const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const deploymentService = require("../services/deploymentService");
const websiteService = require("../services/websiteService");

const fs = require("fs");
const path = require("path");
const extract = require("extract-zip");

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

    // Check if there is already a deployment running
    const activeDeployments = await deploymentService.getActiveDeployments(websiteId);
    if (activeDeployments.length > 0) {
        const err = new Error("A deployment is currently in progress for this website");
        err.statusCode = 409;
        throw err;
    }

    // Create deployment record
    const deploymentId = await deploymentService.createDeployment(websiteId, req.file.filename);
    await deploymentService.addDeploymentLog(deploymentId, "Deployment", "pending", "Deployment initialized");
    await deploymentService.addDeploymentLog(deploymentId, "ZIP Upload", "uploading", "File upload started");
    await deploymentService.addDeploymentLog(deploymentId, "ZIP Upload", "uploaded", "File uploaded successfully");
    await websiteService.updateWebsite(userId, websiteId, website.name, 'uploaded');

    sendSuccess(res, {
        filename: req.file.filename,
        status: 'uploaded',
        deploymentId
    }, "Upload process completed");
});

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

    // Mark as deploying
    await deploymentService.updateDeploymentStatus(deploymentId, 'deploying');
    await websiteService.updateWebsite(userId, websiteId, website.name, 'deploying');

    const uploadPath = path.join(__dirname, "../../storage/uploads", String(userId), String(websiteId), deployment.filename);
    const extractPath = path.join(__dirname, "../../storage/sites", String(userId), String(websiteId));

    try {
        await deploymentService.addDeploymentLog(deploymentId, "Extraction", "pending", "Extracting ZIP");
        
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
        
        // extract-zip protects against Zip Slip attacks natively by resolving absolute paths and verifying they fall within the target directory
        await extract(uploadPath, { dir: extractPath });

        // Directory Flattening Logic
        const items = fs.readdirSync(extractPath);
        if (items.length === 1) {
            const singleItemPath = path.join(extractPath, items[0]);
            if (fs.statSync(singleItemPath).isDirectory()) {
                const hasIndex = fs.existsSync(path.join(singleItemPath, "index.html"));
                const hasPackage = fs.existsSync(path.join(singleItemPath, "package.json"));
                if (hasIndex || hasPackage) {
                    const innerItems = fs.readdirSync(singleItemPath);
                    for (const item of innerItems) {
                        fs.renameSync(path.join(singleItemPath, item), path.join(extractPath, item));
                    }
                    fs.rmdirSync(singleItemPath);
                    await deploymentService.addDeploymentLog(deploymentId, "Extraction", "success", "Flattened nested root directory");
                }
            }
        }

        await deploymentService.addDeploymentLog(deploymentId, "Extraction", "success", "ZIP Extracted safely");
    } catch (err) {
        await deploymentService.updateDeploymentStatus(deploymentId, 'failed');
        await deploymentService.addDeploymentLog(deploymentId, "Extraction", "failed", err.message);
        await websiteService.updateWebsite(userId, websiteId, website.name, 'failed');
        throw new Error("Failed to extract ZIP"); // Mask internal paths
    }

    // Detection Engine & Real Deployment Flow
    let deployStatus = 'pending';
    let deployType = website.type;
    const pm2Helper = require("../utils/pm2Helper");
    const { execPromise } = pm2Helper;
    
    // Process Name: deployly-user{userId}-site{websiteId}
    const processName = `deployly-user${userId}-site${websiteId}`;

    if (fs.existsSync(path.join(extractPath, "package.json"))) {
        deployType = 'node';
        deployStatus = 'installing';
        await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
        await websiteService.updateWebsiteDeploymentData(websiteId, { status: deployStatus });
        await deploymentService.addDeploymentLog(deploymentId, "Detection", "success", "Node.js app detected");
        
        // Node Installation
        const startInstall = Date.now();
        const hasLockFile = fs.existsSync(path.join(extractPath, "package-lock.json"));
        const installCmd = hasLockFile ? 'npm ci' : 'npm install';
        
        await deploymentService.addDeploymentLog(deploymentId, "Installation", "pending", `Running ${installCmd}`);
        
        const installRes = await execPromise(installCmd, { cwd: extractPath });
        const installDuration = Date.now() - startInstall;

        if (installRes.error) {
            deployStatus = 'failed';
            await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
            await websiteService.updateWebsiteDeploymentData(websiteId, { 
                status: deployStatus, 
                last_error: installRes.stderr || installRes.error.message 
            });
            await deploymentService.addDeploymentLog(deploymentId, "Installation", "failed", 
                `Command: ${installCmd}\nExit Code: ${installRes.error.code}\nDuration: ${installDuration}ms\nStderr: ${installRes.stderr}`);
            throw new Error("Installation failed. Deployment aborted.");
        } else {
            await deploymentService.addDeploymentLog(deploymentId, "Installation", "success", 
                `Command: ${installCmd}\nDuration: ${installDuration}ms\nStdout: ${installRes.stdout}`);
        }

        // PM2 Execution
        deployStatus = 'starting';
        await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
        await websiteService.updateWebsiteDeploymentData(websiteId, { status: deployStatus });
        
        const startExecution = Date.now();
        
        // If it was already running, stop/delete it first to ensure a clean start
        await pm2Helper.deleteProcess(processName);
        
        const pm2StartCmd = `pm2 start npm --name "${processName}" -- start`;
        await deploymentService.addDeploymentLog(deploymentId, "Startup", "pending", `Executing ${pm2StartCmd}`);
        
        const startRes = await execPromise(pm2StartCmd, { cwd: extractPath });
        const executionDuration = Date.now() - startExecution;

        if (startRes.error) {
            deployStatus = 'failed';
            await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
            await websiteService.updateWebsiteDeploymentData(websiteId, { 
                status: deployStatus, 
                last_error: startRes.stderr || startRes.error.message 
            });
            await deploymentService.addDeploymentLog(deploymentId, "Startup", "failed", 
                `Exit Code: ${startRes.error.code}\nDuration: ${executionDuration}ms\nStderr: ${startRes.stderr}`);
        } else {
            deployStatus = 'running';
            await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
            await websiteService.updateWebsiteDeploymentData(websiteId, { 
                status: deployStatus, 
                pm2_process: processName,
                last_deployed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                last_error: null
            });
            await deploymentService.addDeploymentLog(deploymentId, "Startup", "success", 
                `Duration: ${executionDuration}ms\nStdout: ${startRes.stdout}`);
        }
        
    } else if (fs.existsSync(path.join(extractPath, "index.html"))) {
        deployType = 'static';
        deployStatus = 'running';
        await deploymentService.addDeploymentLog(deploymentId, "Detection", "success", "Static HTML detected");
        
        // Ensure PM2 process is deleted if it transitioned from Node to Static
        await pm2Helper.deleteProcess(processName);
        
        await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
        await websiteService.updateWebsiteDeploymentData(websiteId, { 
            status: deployStatus, 
            pm2_process: null,
            last_deployed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            last_error: null
        });
        await deploymentService.addDeploymentLog(deploymentId, "Deployment", "running", "Static site running (Served natively)");
    } else {
        deployStatus = 'failed';
        await deploymentService.updateDeploymentStatus(deploymentId, deployStatus);
        await websiteService.updateWebsiteDeploymentData(websiteId, { status: deployStatus, last_error: "No index.html or package.json found" });
        await deploymentService.addDeploymentLog(deploymentId, "Detection", "failed", "No index.html or package.json found");
    }

    const baseUrl = process.env.BASE_URL || `http://${req.get('host')}`;
    const previewUrl = `${baseUrl}/sites/${userId}/${websiteId}/`;

    sendSuccess(res, {
        status: deployStatus,
        type: deployType,
        deploymentId,
        previewUrl
    }, "Deployment process completed");
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
    uploadWebsiteZip,
    deployWebsite,
    getDeployments,
    getDeploymentLogs
};
