
const express = require('express');
const router = express.Router();

const {
    verifyPaystackWebhook
} = require('../middleware/paystackWebhook.middleware');

const {
    handlePaystackPayoutWebhook
} = require('../services/paystackPayoutWebhook.service');

/**
 * @swagger
 * tags:
 *   name: Paystack Webhooks
 *   description: Paystack transfer event processing
 */

/**
 * @swagger
 * /webhooks/paystack/transfers:
 *   post:
 *     summary: Receive Paystack transfer webhook events
 *     description: >
 *       Receives transfer.success, transfer.failed and transfer.reversed
 *       events. The raw request body is verified using the Paystack
 *       X-Paystack-Signature HMAC SHA512 signature before processing.
 *       Duplicate events are handled idempotently.
 *     tags: [Paystack Webhooks]
 *     parameters:
 *       - in: header
 *         name: x-paystack-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Paystack HMAC SHA512 signature.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - data
 *             properties:
 *               event:
 *                 type: string
 *                 enum:
 *                   - transfer.success
 *                   - transfer.failed
 *                   - transfer.reversed
 *               data:
 *                 type: object
 *                 required:
 *                   - reference
 *                   - amount
 *                   - currency
 *                 properties:
 *                   reference:
 *                     type: string
 *                   amount:
 *                     type: integer
 *                     description: Transfer amount in kobo.
 *                   currency:
 *                     type: string
 *                     example: NGN
 *                   transfer_code:
 *                     type: string
 *                   reason:
 *                     type: string
 *     responses:
 *       200:
 *         description: Webhook event processed or already processed
 *       400:
 *         description: Invalid webhook request or payload
 *       401:
 *         description: Invalid Paystack signature
 *       500:
 *         description: Webhook processing failed
 */
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
