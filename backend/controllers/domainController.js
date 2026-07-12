const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const domainService = require("../services/domainService");
const { sendSuccess } = require("../utils/apiResponse");

const domainSchema = Joi.object({
    domain: Joi.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/).required()
});

const getDomains = asyncHandler(async (req, res) => {
    const domains = await domainService.getDomainsForUser(req.user.id);
    sendSuccess(res, { domains }, "Domains fetched successfully");
});

const addDomain = asyncHandler(async (req, res) => {
    const { error } = domainSchema.validate(req.body);
    if (error) {
        const err = new Error("Invalid domain format");
        err.statusCode = 400;
        throw err;
    }

    const { domain } = req.body;
    await domainService.addDomainForUser(req.user.id, domain);

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
