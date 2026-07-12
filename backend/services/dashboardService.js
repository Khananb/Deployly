const db = require("../config/db");

const getDashboardSummaryData = async (user) => {
    const stats = await getDashboardStats(user.id);

    return {
        statistics: {
            totalWebsites: stats.totalWebsites,
            activeWebsites: stats.activeWebsites,
            pendingWebsites: stats.pendingWebsites,
            failedWebsites: stats.failedWebsites,
            lastDeploymentTime: stats.lastDeploymentTime
        },
        user: {
            id: user.id,
            email: user.email
        }
    };
};

const getDashboardStats = async (userId) => {
    const [[{ totalWebsites }]] = await db.execute(
        "SELECT COUNT(*) AS totalWebsites FROM websites WHERE user_id = ?",
        [userId]
    );

    const [[{ activeWebsites }]] = await db.execute(
        "SELECT COUNT(*) AS activeWebsites FROM websites WHERE user_id = ? AND status = 'running'",
        [userId]
    );

    const [[{ pendingWebsites }]] = await db.execute(
        "SELECT COUNT(*) AS pendingWebsites FROM websites WHERE user_id = ? AND status IN ('pending', 'deploying')",
        [userId]
    );

    const [[{ failedWebsites }]] = await db.execute(
        "SELECT COUNT(*) AS failedWebsites FROM websites WHERE user_id = ? AND status = 'failed'",
        [userId]
    );

    const [[{ lastDeploymentTime }]] = await db.execute(
        "SELECT MAX(d.created_at) AS lastDeploymentTime FROM deployments d JOIN websites w ON d.website_id = w.id WHERE w.user_id = ?",
        [userId]
    );

    return {
        totalWebsites: totalWebsites || 0,
        activeWebsites: activeWebsites || 0,
        pendingWebsites: pendingWebsites || 0,
        failedWebsites: failedWebsites || 0,
        lastDeploymentTime: lastDeploymentTime || null
    };
};

module.exports = { getDashboardSummaryData };
