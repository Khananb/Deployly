const axios = require('axios');
const db = require('./backend/config/db');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3000/api';
let token;
let userId;

async function runQA() {
    console.log("=== SPRINT 12 QA (Billing & Trial MVP) ===");
    
    // 1. Setup Mock User
    console.log("\n[1] Setting up mock user...");
    await db.execute("DELETE FROM users WHERE email = 'test_billing@aistack.fun'");
    const [result] = await db.execute(`
        INSERT INTO users (name, email, password, billing_status, trial_start_at, trial_end_at) 
        VALUES ('Billing Test', 'test_billing@aistack.fun', 'password', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
    `);
    userId = result.insertId;

    token = jwt.sign({ id: userId, email: 'test_billing@aistack.fun' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    console.log("✔ User created successfully.");

    // 2. Fetch Initial Status
    console.log("\n[2] Fetching initial billing status (Active)...");
    let res = await axios.get(`${API_URL}/billing/status`, { headers: { Authorization: `Bearer ${token}` }});
    console.log(`Status: ${res.data.data.status}, Trial Remaining Ms: ${res.data.data.trialRemainingMs}`);
    
    // 3. Simulate Trial Expiry (Grace Period)
    console.log("\n[3] Simulating Trial Expiry (Entering Grace)...");
    await db.execute(`UPDATE users SET trial_end_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?`, [userId]);
    // Run cron job logic manually for testing
    await db.execute(`UPDATE users SET billing_status = 'grace' WHERE billing_status = 'active' AND trial_end_at < NOW()`);
    
    res = await axios.get(`${API_URL}/billing/status`, { headers: { Authorization: `Bearer ${token}` }});
    console.log(`Status: ${res.data.data.status}, Grace Remaining Ms: ${res.data.data.graceRemainingMs}`);

    // 4. Simulate Grace Expiry (Suspension)
    console.log("\n[4] Simulating Grace Expiry (Suspension)...");
    await db.execute(`UPDATE users SET trial_end_at = DATE_SUB(NOW(), INTERVAL 35 MINUTE) WHERE id = ?`, [userId]);
    await db.execute(`UPDATE users SET billing_status = 'suspended' WHERE id = ?`, [userId]); // Simulating Cron

    res = await axios.get(`${API_URL}/billing/status`, { headers: { Authorization: `Bearer ${token}` }});
    console.log(`Status: ${res.data.data.status}`);

    // 5. Upgrade & Payment Link
    console.log("\n[5] Generating Upgrade Link...");
    try {
        const upgradeRes = await axios.post(`${API_URL}/billing/upgrade`, {}, { headers: { Authorization: `Bearer ${token}` }});
        console.log(`Payment Link: ${upgradeRes.data.data.short_url}`);
    } catch(err) {
        console.log("Could not generate link (Expected if Razorpay keys are not set in .env)");
    }

    // 6. Simulate Razorpay Webhook Success
    console.log("\n[6] Simulating Razorpay Webhook (Payment Success)...");
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret';
    
    const payload = {
        event: 'payment_link.paid',
        payload: {
            payment_link: {
                entity: {
                    id: 'plink_test123',
                    amount: 50000,
                    currency: 'INR',
                    notes: { user_id: userId }
                }
            }
        }
    };

    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    
    try {
        await axios.post(`${API_URL}/billing/webhook`, payload, {
            headers: { 'x-razorpay-signature': signature }
        });
        console.log("Webhook executed successfully.");
    } catch(err) {
        console.error("Webhook Failed:", err.response ? err.response.data : err.message);
    }

    // 7. Verify Restoration
    console.log("\n[7] Verifying Restoration...");
    res = await axios.get(`${API_URL}/billing/status`, { headers: { Authorization: `Bearer ${token}` }});
    console.log(`Status: ${res.data.data.status}, Paid Until: ${res.data.data.paid_until}`);

    console.log("\n[8] Checking History...");
    res = await axios.get(`${API_URL}/billing/history`, { headers: { Authorization: `Bearer ${token}` }});
    console.log(`History count: ${res.data.data.history.length}`);

    console.log("\n=== QA COMPLETE ===");
    process.exit(0);
}

runQA().catch(console.error);
