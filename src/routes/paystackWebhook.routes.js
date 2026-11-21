
const express = require('express');
const router = express.Router();

const {
    verifyPaystackWebhook
} = require('../middleware/paystackWebhook.middleware');

const {
    handlePaystackPayoutWebhook
} = require('../services/paystackPayoutWebhook.service');

router.post(
    '/transfers',
    express.raw({ type: 'application/json' }),
    verifyPaystackWebhook,
    async (req, res) => {
        try {
            await handlePaystackPayoutWebhook(req.body);

            return res.sendStatus(200);
        } catch (error) {
            console.error('Paystack payout webhook error:', error);

            return res.status(500).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }
);

module.exports = router;
