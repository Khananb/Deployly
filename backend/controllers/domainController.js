const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const domainService = require("../services/domainService");
const { sendSuccess } = require("../utils/apiResponse");

const domainSchema = Joi.object({
    domain: Joi.string().domain().required(),
    websiteId: Joi.number().required()
});

const getDomains = asyncHandler(async (req, res) => {
    const { websiteId } = req.query;
    let domains;
    if (websiteId) {
        domains = await domainService.getDomainsForWebsite(req.user.id, websiteId);
    } else {
        domains = await domainService.getDomainsForUser(req.user.id);
    }
    sendSuccess(res, { domains }, "Domains fetched successfully");
});

const addDomain = asyncHandler(async (req, res) => {
    const { error } = domainSchema.validate(req.body);
    if (error) {
        const err = new Error(`Invalid request: ${error.details[0].message}`);
        err.statusCode = 400;
        throw err;
    }

    const { domain, websiteId } = req.body;
    await domainService.addDomainForUser(req.user.id, websiteId, domain);

    // Note: Do not trigger SSL generation here. It runs post-deployment.

    sendSuccess(res, {}, "Domain added successfully", 201);
});

const updateDomain = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await domainService.updateDomainStatus(id, req.user.id, status);

    sendSuccess(res, {}, "Domain updated successfully");
});

const deleteDomain = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await domainService.removeDomain(id, req.user.id);

    sendSuccess(res, {}, "Domain deleted successfully");
});

module.exports = {
    addDomain,
    getDomains,
    updateDomain,
    deleteDomain
};
