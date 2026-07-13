const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboardService");
const { sendSuccess } = require("../utils/apiResponse");
const Subscription = require("../models/Subscription");
const db = require("../config/db");
const Plan = require("../models/Plan");

const getDashboardSummary = asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboardSummaryData(req.user);
    sendSuccess(res, data, "Welcome to Deployly Dashboard");
});

const getUsage = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const sub = await Subscription.getActiveSubscription(userId);

    if (!sub) {
        const err = new Error("No active subscription found.");
        err.statusCode = 403;
        throw err;
    }

    // Storage and Bandwidth logic will need file system or Nginx logs in the future, 
    // for now we return 0 for used.
    
    // Webistes
    const [[{ totalWebsites }]] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ?`, [userId]);
    const [[{ nodeWebsites }]] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'node'`, [userId]);
    const [[{ phpWebsites }]] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'php'`, [userId]);
    
    // Domains
    const [[{ totalDomains }]] = await db.query(`SELECT COUNT(*) as count FROM domains WHERE user_id = ?`, [userId]);
    
    // MySQL
    const [[{ totalMysql }]] = await db.query(`SELECT COUNT(*) as count FROM user_databases WHERE user_id = ?`, [userId]);

    // Founder Slots (Global)
    const founderPlan = await Plan.getFounderPlan();

    const usage = {
        storage: {
            used: 0,
            limit: sub.storage_limit_mb,
            remaining: sub.storage_limit_mb
        },
        bandwidth: {
            used: 0,
            limit: sub.bandwidth_limit_gb,
            remaining: sub.bandwidth_limit_gb
        },
        websites: {
            used: totalWebsites || 0,
            limit: sub.website_limit,
            remaining: Math.max(0, sub.website_limit - (totalWebsites || 0))
        },
        domains: {
            used: totalDomains || 0,
            limit: sub.domain_limit,
            remaining: Math.max(0, sub.domain_limit - (totalDomains || 0))
        },
        mysql: {
            used: totalMysql || 0,
            limit: sub.mysql_limit,
            remaining: Math.max(0, sub.mysql_limit - (totalMysql || 0))
        },
        node: {
            used: nodeWebsites || 0,
            limit: sub.node_limit,
            remaining: Math.max(0, sub.node_limit - (nodeWebsites || 0))
        },
        php: {
            used: phpWebsites || 0,
            limit: sub.php_limit,
            remaining: Math.max(0, sub.php_limit - (phpWebsites || 0))
        },
        email: {
            used: 0,
            limit: sub.email_limit,
            remaining: sub.email_limit
        },
        founder_slots: {
            used: founderPlan ? founderPlan.used_slots : 0,
            limit: founderPlan ? founderPlan.max_slots : 0,
            remaining: founderPlan ? Math.max(0, founderPlan.max_slots - founderPlan.used_slots) : 0
        }
    };

    sendSuccess(res, usage, "Usage statistics retrieved");
});

module.exports = { getDashboardSummary, getUsage };
