const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const websiteService = require("../services/websiteService");
const { sendSuccess } = require("../utils/apiResponse");

const websiteSchema = Joi.object({
    name: Joi.string().required(),
    domain: Joi.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/).required(),
    type: Joi.string().valid('node', 'php').required()
});

const updateWebsiteSchema = Joi.object({
    name: Joi.string().required(),
    status: Joi.string().valid('pending', 'uploading', 'uploaded', 'deploying', 'installing', 'starting', 'running', 'failed', 'stopping', 'stopped', 'ready').required()
});

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
    
    await websiteService.updateWebsite(req.user.id, id, value.name, value.status);
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
    
    // Stop and Delete PM2 process
    if (website.pm2_process) {
        await pm2Helper.stopProcess(website.pm2_process).catch(() => {});
        await pm2Helper.deleteProcess(website.pm2_process).catch(() => {});
    }

    // Delete files
    const sitesPath = path.join(__dirname, "../../storage/sites", String(userId), String(id));
    const uploadsPath = path.join(__dirname, "../../storage/uploads", String(userId), String(id));
    
    if (fs.existsSync(sitesPath)) fs.rmSync(sitesPath, { recursive: true, force: true });
    if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });

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
