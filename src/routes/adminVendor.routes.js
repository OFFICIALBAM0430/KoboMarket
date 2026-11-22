
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    rejectVendorStoreSchema
} = require('../validators/adminVendor.validator');

const {
    getPendingStores,
    approveStore,
    rejectStore,
    suspendStore
} = require('../controllers/adminVendor.controller');

/**
 * @swagger
 * tags:
 *   name: Admin Vendors
 *   description: Administrator vendor approval and moderation
 */

router.use(protect, authorize('admin'));

/**
 * @swagger
 * /admin/vendors/pending:
 *   get:
 *     summary: List pending vendor stores
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending stores retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator permission required
 */
router.get('/pending', getPendingStores);

/**
 * @swagger
 * /admin/vendors/{storeId}/approve:
 *   patch:
 *     summary: Approve a vendor store
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor store approved
 *       404:
 *         description: Store not found
 */
router.patch('/:storeId/approve', approveStore);

/**
 * @swagger
 * /admin/vendors/{storeId}/reject:
 *   patch:
 *     summary: Reject a vendor store
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
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
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Incomplete vendor information
 *     responses:
 *       200:
 *         description: Vendor store rejected
 *       400:
 *         description: Rejection reason is invalid
 *       404:
 *         description: Store not found
 */
router.patch(
    '/:storeId/reject',
    validate(rejectVendorStoreSchema),
    rejectStore
);

/**
 * @swagger
 * /admin/vendors/{storeId}/suspend:
 *   patch:
 *     summary: Suspend a vendor store
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
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
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor store suspended
 *       404:
 *         description: Store not found
 */
router.patch(
    '/:storeId/suspend',
    validate(rejectVendorStoreSchema),
    suspendStore
);

module.exports = router;
