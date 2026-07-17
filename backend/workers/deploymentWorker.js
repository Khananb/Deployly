require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });
const { Worker } = require('bullmq');
const { connection } = require('../queue/deploymentQueue');
const fs = require("fs");
const path = require("path");
const deploymentService = require("../services/deploymentService");
const websiteService = require("../services/websiteService");
const ZipService = require("../services/zipService");
const ProjectDetector = require("../services/projectDetector");
const domainService = require("../services/domainService");

const worker = new Worker('deployments', async job => {
    const { deploymentId, websiteId, userId, uploadPath, extractPath } = job.data;
    
    try {
        await deploymentService.updateDeploymentStatus(deploymentId, 'PREPARING');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Preparing project...");
        
        // Extract
        await ZipService.validateAndExtract(uploadPath, extractPath);
        
        // Detect Project
        const detectionResult = ProjectDetector.detectProject(extractPath);
        
        await deploymentService.updateDeploymentMetadata(deploymentId, detectionResult.projectType, detectionResult.framework);
        if (detectionResult.projectType !== 'unknown' && detectionResult.projectType !== 'unsupported') {
            await websiteService.updateWebsiteDeploymentData(websiteId, { type: detectionResult.projectType });
        }

        if (detectionResult.projectType === 'unsupported') {
            await deploymentService.updateDeploymentStatus(deploymentId, 'FAILED');
            await deploymentService.addDeploymentLog(deploymentId, "Detection", "failed", "Deployment couldn't start. We couldn't identify a supported project inside this ZIP. Supported: React Vite, React CRA, Express, PHP, Laravel, Static HTML");
            throw new Error("Unsupported project type.");
        }

        await deploymentService.updateDeploymentStatus(deploymentId, 'BUILDING');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Installing dependencies...");
        
        let autoDeployResult = true;
        if (detectionResult.projectType === 'node') {
            await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Building...");
            const NodeDeploymentService = require("../services/nodeDeploymentService");
            autoDeployResult = await NodeDeploymentService.deployNodeWebsite(userId, websiteId, deploymentId, extractPath);
        } else if (detectionResult.projectType === 'static') {
            await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Building...");
            const StaticDeploymentService = require("../services/staticDeploymentService");
            autoDeployResult = await StaticDeploymentService.deployStaticWebsite(userId, websiteId, deploymentId, extractPath);
        }

        if (!autoDeployResult) {
            throw new Error("Deployment failed during build/execution stage.");
        }

        await deploymentService.updateDeploymentStatus(deploymentId, 'DEPLOYING');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Deploying...");

        // Domains
        await domainService.processDomainsForWebsite(userId, websiteId, deploymentId).catch(console.error);

        await deploymentService.updateDeploymentStatus(deploymentId, 'VERIFYING');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "pending", "Verifying deployment...");
        
        // Mark as SUCCESS
        await deploymentService.updateDeploymentStatus(deploymentId, 'SUCCESS');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "success", "Deployment completed.");

    } catch (err) {
        await deploymentService.updateDeploymentStatus(deploymentId, 'FAILED');
        await deploymentService.addDeploymentLog(deploymentId, "Auto-Deploy", "failed", err.message);
        throw err;
    }
}, { 
    connection,
    concurrency: 5
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

console.log("Deployment Worker started");
