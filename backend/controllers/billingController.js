const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const pm2Helper = require('../utils/pm2Helper');
const fs = require('fs');
const path = require('path');
const websiteService = require('../services/websiteService');

let razorpayInstance;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

// 1. Get Billing Status
const getStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [rows] = await db.execute(`
        SELECT billing_status, trial_start_at, trial_end_at, paid_until, eligible_for_deletion 
        FROM users WHERE id = ?
    `, [userId]);
    
    if (rows.length === 0) throw new Error("User not found");
    const user = rows[0];

    let trialRemaining = 0;
    let graceRemaining = 0;
    let paidRemaining = 0;
    const now = new Date();

    if (user.billing_status === 'active' || user.billing_status === 'grace') {
        const trialEnd = new Date(user.trial_end_at);
        trialRemaining = Math.max(0, trialEnd - now);
        
        if (trialRemaining === 0) {
            const graceEnd = new Date(trialEnd.getTime() + 30 * 60 * 1000); // 30 mins grace
            graceRemaining = Math.max(0, graceEnd - now);
        }
    }

    if (user.billing_status === 'paid' && user.paid_until) {
        paidRemaining = Math.max(0, new Date(user.paid_until) - now);
    }

    sendSuccess(res, {
        status: user.billing_status,
        trial_start_at: user.trial_start_at,
        trial_end_at: user.trial_end_at,
        paid_until: user.paid_until,
        eligible_for_deletion: user.eligible_for_deletion,
        trialRemainingDays: trialRemaining / (1000 * 60 * 60 * 24),
        trialRemainingMs: trialRemaining,
        graceRemainingMs: graceRemaining,
        paidRemainingDays: paidRemaining / (1000 * 60 * 60 * 24),
    }, "Billing status fetched");
});

// 2. Create Payment Link
const upgradePlan = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!razorpayInstance) {
        throw new Error("Razorpay is not configured");
    }

    // MVP: Flat pricing of 500 INR for 30 days
    const paymentLinkRequest = {
        amount: 500 * 100, // in paise
        currency: "INR",
        accept_partial: false,
        description: "Deployly 30-Day Pro Plan",
        customer: {
            email: userEmail
        },
        notify: {
            sms: false,
            email: true
        },
        reminder_enable: true,
        notes: {
            user_id: userId
        }
    };

    const paymentLink = await razorpayInstance.paymentLink.create(paymentLinkRequest);

    sendSuccess(res, {
        payment_link_id: paymentLink.id,
        short_url: paymentLink.short_url
    }, "Payment link generated");
});

// 3. Razorpay Webhook
const webhook = asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify signature
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto.createHmac('sha256', secret)
                                    .update(JSON.stringify(req.body))
                                    .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).send("Invalid signature");
    }

    if (req.body.event === 'payment.captured' || req.body.event === 'payment_link.paid') {
        let paymentEntity;
        let userId;

        if (req.body.event === 'payment_link.paid') {
            paymentEntity = req.body.payload.payment_link.entity;
            userId = paymentEntity.notes.user_id;
        } else {
            paymentEntity = req.body.payload.payment.entity;
            userId = paymentEntity.notes.user_id;
        }

        if (!userId) {
            console.error("Webhook received but no user_id found in notes.");
            return res.status(200).send("OK");
        }

        // 1. Update User to Paid for 30 days
        const now = new Date();
        const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // + 30 days
        await db.execute(`
            UPDATE users 
            SET billing_status = 'paid', paid_until = ? 
            WHERE id = ?
        `, [validUntil, userId]);

        // 2. Insert into Billing History
        await db.execute(`
            INSERT INTO billing_history (user_id, razorpay_payment_id, amount, currency, plan_name, payment_status, payment_method, valid_from, valid_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, 
            paymentEntity.id || 'N/A', 
            (paymentEntity.amount || paymentEntity.amount_paid) / 100, 
            paymentEntity.currency || 'INR', 
            'Pro Plan 30 Days', 
            'paid', 
            paymentEntity.method || 'link', 
            now, 
            validUntil
        ]);

        // 3. Restore static sites & restart PM2 processes
        const websites = await websiteService.getWebsites(userId);
        for (const site of websites) {
            const suspendedPath = path.join(__dirname, "../../../storage/suspended_sites", String(userId), String(site.id));
            const activePath = path.join(__dirname, "../../../storage/sites", String(userId), String(site.id));

            // Restore Static Site
            if (fs.existsSync(suspendedPath)) {
                if (!fs.existsSync(path.dirname(activePath))) {
                    fs.mkdirSync(path.dirname(activePath), { recursive: true });
                }
                fs.renameSync(suspendedPath, activePath);
            }

            // Restart PM2 (Only for Node)
            if (site.type === 'node') {
                const processName = `deployly-user${userId}-site${site.id}`;
                await pm2Helper.restartProcess(processName).catch(() => {});
            }
        }
    }

    res.status(200).send("OK");
});

// 4. Get Billing History
const getHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [rows] = await db.execute(`
        SELECT id, razorpay_payment_id, amount, currency, plan_name, payment_status, payment_method, valid_from, valid_until, created_at
        FROM billing_history
        WHERE user_id = ?
        ORDER BY created_at DESC
    `, [userId]);

    sendSuccess(res, { history: rows }, "Billing history fetched");
});

module.exports = {
    getStatus,
    upgradePlan,
    webhook,
    getHistory
};
