
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    createVendorStoreSchema,
    updateVendorStoreSchema
} = require('../validators/vendor.validator');

const {
    createStore,
    getMyStore,
    updateMyStore
} = require('../controllers/vendor.controller');

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor store registration and management
 */

/**
 * @swagger
 * /vendors/store:
 *   post:
 *     summary: Register a vendor store
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeName
 *             properties:
 *               storeName:
 *                 type: string
 *                 example: Official Bam Store
 *               description:
 *                 type: string
 *                 example: Electronics and lifestyle products
 *     responses:
 *       201:
 *         description: Vendor store created
 *       400:
 *         description: Invalid store information
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Store already exists
 */
router.post(
    '/store',
    protect,
    validate(createVendorStoreSchema),
    createStore
);

/**
 * @swagger
 * /vendors/store/me:
 *   get:
 *     summary: Get the authenticated vendor's store
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor store retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Vendor permission required
 */
router.get(
    '/store/me',
    protect,
    authorize('vendor'),
    getMyStore
);

/**
 * @swagger
 * /vendors/store/me:
 *   patch:
 *     summary: Update the authenticated vendor's store
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor store updated
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Vendor permission required
 */
router.patch(
    '/store/me',
    protect,
    authorize('vendor'),
    validate(updateVendorStoreSchema),
    updateMyStore
);

module.exports = router;
