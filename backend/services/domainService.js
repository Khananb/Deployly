const Domain = require("../models/Domain");

const getDomainsForUser = async (userId) => {
    return await Domain.findByUserId(userId);
};

const addDomainForUser = async (userId, domain) => {
    await Domain.create(userId, domain);
};

const updateDomainStatus = async (id, userId, status) => {
    const validStatuses = ['pending', 'active', 'failed'];
    if (!validStatuses.includes(status)) {
        const error = new Error("Invalid status");
        error.statusCode = 400;
        throw error;
    }

    const success = await Domain.updateStatus(id, userId, status);
    if (!success) {
        const error = new Error("Domain not found or unauthorized");
        error.statusCode = 404;
        throw error;
    }
};

const removeDomain = async (id, userId) => {
    const success = await Domain.remove(id, userId);
    if (!success) {
        const error = new Error("Domain not found or unauthorized");
        error.statusCode = 404;
        throw error;
    }
};

module.exports = {
    getDomainsForUser,
    addDomainForUser,
    updateDomainStatus,
    removeDomain
};
