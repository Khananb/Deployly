const asyncHandler = require("../utils/asyncHandler");
const Subscription = require("../models/Subscription");
const db = require("../config/db");

const enforceLimit = (resourceType) => {
    return asyncHandler(async (req, res, next) => {
        const userId = req.user.id;
        const sub = await Subscription.getActiveSubscription(userId);
        
        if (!sub) {
            const err = new Error("No active subscription found.");
            err.statusCode = 403;
            throw err;
        }

        let currentCount = 0;
        let limit = 0;

        switch (resourceType) {
            case 'website': {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ?`, [userId]);
                currentCount = rows[0].count;
                limit = sub.website_limit;
                
                if (currentCount >= limit) {
                    const err = new Error("Plan limit reached for websites.");
                    err.statusCode = 403;
                    throw err;
                }

                // Also check specific type limit if provided in req.body
                if (req.body && req.body.type) {
                    if (req.body.type === 'node') {
                        const [nodeRows] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'node'`, [userId]);
                        if (nodeRows[0].count >= sub.node_limit) {
                            const err = new Error("Plan limit reached for Node.js apps.");
                            err.statusCode = 403;
                            throw err;
                        }
                    } else if (req.body.type === 'php') {
                        const [phpRows] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'php'`, [userId]);
                        if (phpRows[0].count >= sub.php_limit) {
                            const err = new Error("Plan limit reached for PHP apps.");
                            err.statusCode = 403;
                            throw err;
                        }
                    }
                }
                break;
            }
            case 'domain': {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM domains WHERE user_id = ?`, [userId]);
                currentCount = rows[0].count;
                limit = sub.domain_limit;
                break;
            }
            case 'mysql': {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM user_databases WHERE user_id = ?`, [userId]);
                currentCount = rows[0].count;
                limit = sub.mysql_limit;
                break;
            }
            case 'node': {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'node'`, [userId]);
                currentCount = rows[0].count;
                limit = sub.node_limit;
                break;
            }
            case 'php': {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM websites WHERE user_id = ? AND type = 'php'`, [userId]);
                currentCount = rows[0].count;
                limit = sub.php_limit;
                break;
            }
            // Add email later when implemented
            default:
                break;
        }

        if (currentCount >= limit) {
            const err = new Error("Plan limit reached.");
            err.statusCode = 403;
            throw err;
        }

        // Attach subscription to req for later use if needed
        req.subscription = sub;
        next();
    });
};

module.exports = {
    enforceLimit
};
