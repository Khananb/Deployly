const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const websiteService = require("../services/websiteService");
const { sendSuccess } = require("../utils/apiResponse");

const websiteSchema = Joi.object({
    name: Joi.string().max(255).required(),
    domain: Joi.string().domain().required(),
    type: Joi.string().valid('node', 'php', 'static', 'unknown').default('unknown')
});

const updateWebsiteSchema = Joi.object({
    name: Joi.string().max(255).optional(),
    domain: Joi.string().domain().optional()
}).min(1);

const createWebsite = asyncHandler(async (req, res) => {
    const { error, value } = websiteSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    const { name, domain, type } = value;
    const website = await websiteService.createWebsite(req.user.id, name, domain, type);
    
    sendSuccess(res, website, "Website created successfully", 201);
});

const getWebsites = asyncHandler(async (req, res) => {
    const websites = await websiteService.getWebsites(req.user.id);
    sendSuccess(res, { websites }, "Websites fetched successfully");
});

const getWebsiteById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const website = await websiteService.getWebsiteById(req.user.id, id);
    sendSuccess(res, { website }, "Website details fetched successfully");
});

const updateWebsite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { error, value } = updateWebsiteSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }
    
    await websiteService.updateWebsite(req.user.id, id, value);
    sendSuccess(res, {}, "Website updated successfully");
});

const pm2Helper = require("../utils/pm2Helper");
const fs = require("fs");
const path = require("path");

const restartWebsite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const website = await websiteService.getWebsiteById(req.user.id, id);
    
    if (!['running', 'stopped', 'failed'].includes(website.status)) {
        const err = new Error(`Cannot restart website in status: ${website.status}`);
        err.statusCode = 400;
        throw err;
    }

    if (!website.pm2_process) {
        const err = new Error("Website is not a Node.js application or has no PM2 process");
        err.statusCode = 400;
        throw err;
    }

    await websiteService.updateWebsiteDeploymentData(id, { status: 'starting' });
    const { error, stdout, stderr } = await pm2Helper.restartProcess(website.pm2_process);
    
    if (error) {
        await websiteService.updateWebsiteDeploymentData(id, { status: 'failed', last_error: stderr || error.message });
        throw new Error("Failed to restart PM2 process");
    }

    await websiteService.updateWebsiteDeploymentData(id, { status: 'running', last_error: null });
    sendSuccess(res, { stdout }, "Website restarted successfully");
});

const stopWebsite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const website = await websiteService.getWebsiteById(req.user.id, id);
    
    if (!website.pm2_process) {
        const err = new Error("Website is not a Node.js application or has no PM2 process");
        err.statusCode = 400;
        throw err;
    }

    await websiteService.updateWebsiteDeploymentData(id, { status: 'stopping' });
    const { error, stdout, stderr } = await pm2Helper.stopProcess(website.pm2_process);
    
    if (error) {
        await websiteService.updateWebsiteDeploymentData(id, { status: 'failed', last_error: stderr || error.message });
        throw new Error("Failed to stop PM2 process");
    }

    await websiteService.updateWebsiteDeploymentData(id, { status: 'stopped' });
    sendSuccess(res, { stdout }, "Website stopped successfully");
});

const deleteWebsite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const website = await websiteService.getWebsiteById(userId, id);
    
    // Prevent deletion during active deployment to avoid zombie PM2 processes and orphan files
    const deploymentService = require("../services/deploymentService");
    const activeDeployments = await deploymentService.getActiveDeployments(id);
    if (activeDeployments.length > 0) {
        const err = new Error("Cannot delete website while a deployment is in progress. Please wait for the deployment to finish.");
        err.statusCode = 409;
        throw err;
    }
    
    // Stop and Delete PM2 process
    if (website.pm2_process) {
        await pm2Helper.stopProcess(website.pm2_process).catch(() => {});
        await pm2Helper.deleteProcess(website.pm2_process).catch(() => {});
        if (process.platform !== 'win32') {
            const util = require('util');
            const exec = util.promisify(require('child_process').exec);
            await exec('pm2 save').catch(() => {});
        }
    }

    const sitesPath = path.join(__dirname, "../../storage/sites", String(userId), String(id));
    const uploadsPath = path.join(__dirname, "../../storage/uploads", String(userId), String(id));
    const livePath = path.join(__dirname, "../../storage/live", String(userId), String(id));
    const tmpLivePath = path.join(__dirname, "../../storage/live", String(userId), `${id}_tmp`);
    const backupLivePath = path.join(__dirname, "../../storage/live", String(userId), `${id}_backup`);
    
    if (fs.existsSync(sitesPath)) fs.rmSync(sitesPath, { recursive: true, force: true });
    if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });
    if (fs.existsSync(livePath)) fs.rmSync(livePath, { recursive: true, force: true });
    if (fs.existsSync(tmpLivePath)) fs.rmSync(tmpLivePath, { recursive: true, force: true });
    if (fs.existsSync(backupLivePath)) fs.rmSync(backupLivePath, { recursive: true, force: true });

    // Delete Nginx config
    const isWindows = process.platform === 'win32';
    const nginxConfigDir = isWindows 
        ? path.join(__dirname, '../../storage/mock-nginx/sites-available')
        : '/etc/nginx/sites-available';
    const nginxEnabledDir = isWindows 
        ? path.join(__dirname, '../../storage/mock-nginx/sites-enabled')
        : '/etc/nginx/sites-enabled';
    const configFilename = `deployly-${id}.conf`;
    
    const configPath = path.join(nginxConfigDir, configFilename);
    const symlinkPath = path.join(nginxEnabledDir, configFilename);
    
    if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    
    // Delete Nginx configs and SSL for Custom Domains
    const domainService = require("../services/domainService");
    const sslService = require("../services/sslService");
    const domains = await domainService.getDomainsForWebsite(userId, id);
    for (const domain of domains) {
        const customConfigFilename = `deployly-custom-${domain.id}.conf`;
        const customConfigPath = path.join(nginxConfigDir, customConfigFilename);
        const customSymlinkPath = path.join(nginxEnabledDir, customConfigFilename);
        
        if (fs.existsSync(customSymlinkPath)) fs.unlinkSync(customSymlinkPath);
        if (fs.existsSync(customConfigPath)) fs.unlinkSync(customConfigPath);
        
        await sslService.revokeSSL(domain.domain).catch(() => {});
    }
    
    // Reload Nginx after deleting config
    if (!isWindows) {
        const util = require('util');
        const exec = util.promisify(require('child_process').exec);
        await exec('systemctl reload nginx').catch(() => {});
    }

    // Delete from DB (will cascade delete deployments and logs)
    await websiteService.deleteWebsite(userId, id);
    
    sendSuccess(res, {}, "Website deleted successfully");
});

module.exports = {
    createWebsite,
    getWebsites,
    getWebsiteById,
    updateWebsite,
    restartWebsite,
    stopWebsite,
    deleteWebsite
};
