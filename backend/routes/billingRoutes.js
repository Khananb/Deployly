const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const { getStatus, upgradePlan, webhook, getHistory } = require('../controllers/billingController');

const router = express.Router();

router.get('/status', verifyToken, getStatus);
router.post('/upgrade', verifyToken, upgradePlan);
router.get('/history', verifyToken, getHistory);

// Webhook doesn't use verifyToken as it comes from Razorpay
router.post('/webhook', express.json(), webhook);

module.exports = router;
