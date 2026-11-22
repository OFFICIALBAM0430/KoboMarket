
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    openDisputeSchema,
    resolveDisputeSchema
} = require('../validators/dispute.validator');

const {
    openOrderDispute,
    resolveOrderDispute,
    getOpenDisputes
} = require('../controllers/dispute.controller');

/**
 * @swagger
 * tags:
 *   name: Disputes
 *   description: Buyer disputes and administrator resolution
 */

router.use(protect);

/**
 * @swagger
 * /disputes/admin/open:
 *   get:
 *     summary: Get all open disputes
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Open disputes retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator permission required
 */
router.get(
    '/admin/open',
    authorize('admin'),
    getOpenDisputes
);

/**
 * @swagger
 * /disputes/orders/{subOrderId}:
 *   post:
 *     summary: Open a dispute for an order
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subOrderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - description
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Dispute opened
 *       400:
 *         description: Invalid dispute information
 *       401:
 *         description: Authentication required
 */
router.post(
    '/orders/:subOrderId',
    validate(openDisputeSchema),
    openOrderDispute
);

/**
 * @swagger
 * /disputes/admin/{disputeId}/resolve:
 *   patch:
 *     summary: Resolve an order dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum:
 *                   - full_refund
 *                   - partial_refund
 *                   - rejected
 *               refundAmountKobo:
 *                 type: integer
 *                 description: Required only for partial_refund; amount is in kobo.
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute resolved
 *       400:
 *         description: Invalid resolution information
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator permission required
 *       404:
 *         description: Dispute not found
 */
router.patch(
    '/admin/:disputeId/resolve',
    authorize('admin'),
    validate(resolveDisputeSchema),
    resolveOrderDispute
);

module.exports = router;
