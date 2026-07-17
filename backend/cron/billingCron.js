const cron = require('node-cron');
const db = require('../config/db');
const websiteService = require('../services/websiteService');
const pm2Helper = require('../utils/pm2Helper');
const fs = require('fs');
const path = require('path');

const runBillingCron = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log("[Billing Cron] Running daily billing check...");
        
        try {
            const now = new Date();
            
            // 1. Check for trial expiry -> grace
            await db.execute(`
                UPDATE users 
                SET billing_status = 'grace' 
                WHERE billing_status = 'active' AND trial_end_at < ?
            `, [now]);

            // 2. Check for grace expiry -> suspended
            // Grace period is 30 mins after trial ends
            const graceExpiryTime = new Date(now.getTime() - 30 * 60 * 1000);
            
            const [usersToSuspend] = await db.execute(`
                SELECT id FROM users 
                WHERE billing_status = 'grace' AND trial_end_at < ?
            `, [graceExpiryTime]);

            for (const user of usersToSuspend) {
                const userId = user.id;
                console.log(`[Billing Cron] Suspending user ${userId}`);
                
                await db.execute(`UPDATE users SET billing_status = 'suspended' WHERE id = ?`, [userId]);

                // Suspend their websites
                const websites = await websiteService.getWebsites(userId);
                for (const site of websites) {
                    const activePath = path.join(__dirname, "../../../storage/sites", String(userId), String(site.id));
                    const suspendedPath = path.join(__dirname, "../../../storage/suspended_sites", String(userId), String(site.id));

                    // Move to suspended folder if exists
                    if (fs.existsSync(activePath)) {
                        if (!fs.existsSync(path.dirname(suspendedPath))) {
                            fs.mkdirSync(path.dirname(suspendedPath), { recursive: true });
                        }
                        fs.renameSync(activePath, suspendedPath);
                    }

                    // Stop PM2 processes for node apps
                    if (site.type === 'node') {
                        const processName = `deployly-user${userId}-site${site.id}`;
                        await pm2Helper.stopProcess(processName).catch(() => {});
                    }
                }
            }

            // 3. Check for paid expiry -> suspended
            const [paidUsersToSuspend] = await db.execute(`
                SELECT id FROM users 
                WHERE billing_status = 'paid' AND paid_until < ?
            `, [now]);

            for (const user of paidUsersToSuspend) {
                const userId = user.id;
                console.log(`[Billing Cron] Suspending user ${userId} (Paid Plan Expired)`);
                
                await db.execute(`UPDATE users SET billing_status = 'suspended' WHERE id = ?`, [userId]);

                const websites = await websiteService.getWebsites(userId);
                for (const site of websites) {
                    const activePath = path.join(__dirname, "../../../storage/sites", String(userId), String(site.id));
                    const suspendedPath = path.join(__dirname, "../../../storage/suspended_sites", String(userId), String(site.id));

                    if (fs.existsSync(activePath)) {
                        if (!fs.existsSync(path.dirname(suspendedPath))) {
                            fs.mkdirSync(path.dirname(suspendedPath), { recursive: true });
                        }
                        fs.renameSync(activePath, suspendedPath);
                    }

                    if (site.type === 'node') {
                        const processName = `deployly-user${userId}-site${site.id}`;
                        await pm2Helper.stopProcess(processName).catch(() => {});
                    }
                }
            }

            // 4. Mark eligible for deletion (suspended for > 30 days)
            // Wait, trial end + 30 days or suspension start + 30 days?
            // If we mark `eligible_for_deletion = true`, we can just check if trial_end_at was > 30.5 days ago,
            // OR paid_until was > 30 days ago.
            // Let's do it safely: if suspended and either (trial_end_at < 30 days ago OR paid_until < 30 days ago).
            const deleteThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            await db.execute(`
                UPDATE users 
                SET eligible_for_deletion = TRUE 
                WHERE billing_status = 'suspended' 
                AND (
                    (paid_until IS NULL AND trial_end_at < ?)
                    OR (paid_until IS NOT NULL AND paid_until < ?)
                )
            `, [deleteThreshold, deleteThreshold]);

        } catch (error) {
            console.error("[Billing Cron] Error during execution:", error);
        }
    });
};

module.exports = runBillingCron;
