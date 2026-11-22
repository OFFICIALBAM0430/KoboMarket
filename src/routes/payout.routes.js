
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { submitPayout } = require('../controllers/payout.controller');

/**
 * @swagger
 * tags:
 *   name: Payouts
 *   description: Vendor withdrawal requests
 */

/**
 * @swagger
 * /payouts:
 *   post:
 *     summary: Request a vendor payout
 *     description: >
 *       Verifies the vendor's Nigerian bank account, reserves funds in the
 *       PostgreSQL ledger and submits a Paystack transfer. Final settlement
 *       is confirmed by the Paystack webhook.
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountKobo
 *               - accountNumber
 *               - bankCode
 *               - idempotencyKey
 *             properties:
 *               amountKobo:
 *                 type: integer
 *                 minimum: 100000
 *                 example: 150000
 *                 description: Amount in kobo. Minimum ₦1,000.
 *               accountNumber:
 *                 type: string
 *                 example: "0123456789"
 *               bankCode:
 *                 type: string
 *                 example: "058"
 *               idempotencyKey:
 *                 type: string
 *                 minLength: 10
 *                 example: "vendor-payout-2026-001"
 *     responses:
 *       202:
 *         description: Transfer submitted or awaiting reconciliation
 *       400:
 *         description: Invalid request or provider rejection
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Active vendor store required
 */
router.post(
    '/',
    protect,
    authorize('vendor'),
    submitPayout
);

module.exports = router;
