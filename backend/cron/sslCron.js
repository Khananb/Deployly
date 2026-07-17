const cron = require('node-cron');
const db = require('../config/db');
const sslService = require('../services/sslService');

const runSSLCron = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[SSL Cron] Starting daily certificate renewal check...');
        try {
            // Find domains that are active and have ssl_status = 'issued' and expire in less than 30 days
            const [domains] = await db.execute(`
                SELECT id, domain, ssl_expires_at 
                FROM domains 
                WHERE status = 'active' 
                AND ssl_status = 'issued' 
                AND ssl_expires_at IS NOT NULL
                AND ssl_expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)
            `);
            
            for (const domain of domains) {
                console.log(`[SSL Cron] Attempting renewal for ${domain.domain}`);
                await sslService.renewCertificate(domain.id, domain.domain);
            }
            console.log('[SSL Cron] Renewal check completed.');
        } catch (error) {
            console.error('[SSL Cron] Error during execution:', error.message);
        }
    });
};

module.exports = runSSLCron;
