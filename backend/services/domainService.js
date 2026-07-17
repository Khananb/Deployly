const db = require('../config/db');
const Domain = require("../models/Domain");
const sslService = require("./sslService");
const deploymentService = require("./deploymentService");
const websiteService = require("./websiteService");

const getDomainsForUser = async (userId) => {
    return await Domain.findByUserId(userId);
};

const getDomainsForWebsite = async (userId, websiteId) => {
    return await Domain.findByWebsiteId(userId, websiteId);
};

const addDomainForUser = async (userId, websiteId, domain) => {
    await Domain.create(userId, websiteId, domain);
};

const updateDomainStatus = async (id, userId, status) => {
    // legacy, kept for compatibility if needed
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
    // Fetch domain first to get the domain name for certbot deletion
    const domain = await Domain.findById(id, userId);
    if (!domain) {
        const error = new Error("Domain not found or unauthorized");
        error.statusCode = 404;
        throw error;
    }
    
    const success = await Domain.remove(id, userId);
    if (!success) {
        const error = new Error("Domain not found or unauthorized");
        error.statusCode = 404;
        throw error;
    }
    
    // Cleanup Nginx and SSL
    await sslService.rollbackConfig(id).catch(() => {});
    await sslService.revokeSSL(domain.domain).catch(() => {});
};

const processDomainsForWebsite = async (userId, websiteId, deploymentId) => {
    try {
        const domains = await Domain.findByWebsiteId(userId, websiteId);
        if (!domains || domains.length === 0) return;

        const website = await websiteService.getWebsiteById(userId, websiteId);
        // Ensure we pass a complete website object with user_id
        website.user_id = userId;

        for (const domain of domains) {
            try {
                await deploymentService.addDeploymentLog(deploymentId, "Custom Domain", "deploying", `Processing domain: ${domain.domain}`);
                
                // 1. Verify DNS
                await deploymentService.addDeploymentLog(deploymentId, "DNS Check", "deploying", `Verifying DNS for ${domain.domain}`);
                const isVerified = await sslService.verifyDNS(domain.domain);
                
                if (!isVerified) {
                    await Domain.updateDNSStatus(domain.id, userId, 'failed');
                    await deploymentService.addDeploymentLog(deploymentId, "DNS Check", "failed", `DNS for ${domain.domain} does not point to our servers.`);
                    continue; // Skip this domain, process others
                }
                await Domain.updateDNSStatus(domain.id, userId, 'verified');
                await deploymentService.addDeploymentLog(deploymentId, "DNS Check", "success", `DNS verified for ${domain.domain}`);

                // 2. Generate Nginx Config
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "deploying", `Generating nginx config for ${domain.domain}`);
                const { configPath, configFilename, nginxEnabledDir } = await sslService.generateNginxConfig(domain.id, domain.domain, website);
                
                // 3. Enable Site & Reload
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "deploying", `Testing and reloading nginx...`);
                await sslService.enableSite(configPath, configFilename, nginxEnabledDir);
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "success", `Nginx configuration active for ${domain.domain}`);
                
                // Set overall domain status active
                await Domain.updateStatus(domain.id, userId, 'active');

                // 4. Issue SSL (Only if DNS verified and Nginx config active)
                if (domain.ssl_status !== 'issued') { // Redeploy compatibility: don't reissue if already issued
                    await deploymentService.addDeploymentLog(deploymentId, "SSL Request", "deploying", `Requesting Let's Encrypt SSL for ${domain.domain}`);
                    await Domain.updateSSLStatus(domain.id, userId, 'pending');
                    
                    try {
                        const sslSuccess = await sslService.issueSSL(domain.domain, deploymentId, domain.id);
                        if (sslSuccess) {
                            await Domain.updateSSLStatus(domain.id, userId, 'issued');
                            await deploymentService.addDeploymentLog(deploymentId, "SSL Issued", "success", `SSL certificate issued and HTTPS activated for ${domain.domain}`);
                        }
                    } catch (sslErr) {
                        await Domain.updateSSLStatus(domain.id, userId, 'failed');
                        
                        const msg = sslErr.message.toLowerCase();
                        const isExpected = msg.includes('challenge failed') || msg.includes('rate limit') || msg.includes('dns') || msg.includes('existing certificate') || msg.includes('not propagated');
                        const level = isExpected ? 'warning' : 'failed';
                        
                        await deploymentService.addDeploymentLog(deploymentId, "SSL Status", level, `SSL Issuance Pending/Failed: ${sslErr.message}. Website will remain accessible via HTTP.`);
                        
                        if (isExpected) {
                            console.warn(`[SSL Warning] Expected failure for ${domain.domain}: ${sslErr.message}`);
                        } else {
                            console.error(`[SSL Error] Unexpected failure for ${domain.domain}: ${sslErr.message}`); // Avoid raw stack traces
                        }
                    }
                } else {
                    await deploymentService.addDeploymentLog(deploymentId, "SSL Request", "success", `SSL already active for ${domain.domain}, skipping issuance.`);
                }

            } catch (err) {
                await deploymentService.addDeploymentLog(deploymentId, "Custom Domain Error", "failed", `Error processing ${domain.domain}: ${err.message}`);
                await sslService.rollbackConfig(domain.id).catch(() => {});
                await Domain.updateStatus(domain.id, userId, 'failed');
            }
        }
    } catch (e) {
        console.error("Error processing domains:", e);
        await deploymentService.addDeploymentLog(deploymentId, "Domain Processing", "failed", `Internal error: ${e.message}`);
    }
};

module.exports = {
    getDomainsForUser,
    getDomainsForWebsite,
    addDomainForUser,
    updateDomainStatus,
    removeDomain,
    processDomainsForWebsite
};
