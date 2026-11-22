
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const { checkoutSchema } = require('../validators/order.validator');

const {
    checkoutOrder,
    listBuyerOrders,
    listVendorOrders,
    changeVendorOrderStatus,
    cancelBuyerSubOrder
} = require('../controllers/order.controller');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Checkout, buyer orders and vendor order management
 */

router.use(protect);

/**
 * @swagger
 * /orders/my-orders/{subOrderId}/cancel:
 *   patch:
 *     summary: Cancel a buyer's sub-order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subOrderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancellation processed
 *       400:
 *         description: Order cannot be cancelled
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Order not found
 */
router.patch(
    '/my-orders/:subOrderId/cancel',
    cancelBuyerSubOrder
);

/**
 * @swagger
 * /orders/checkout:
 *   post:
 *     summary: Checkout the buyer's cart
 *     description: Creates an order using the buyer's cart and an idempotency key.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idempotencyKey
 *               - shippingAddress
 *             properties:
 *               idempotencyKey:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 150
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - fullName
 *                   - phone
 *                   - addressLine1
 *                   - city
 *                   - state
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   addressLine1:
 *                     type: string
 *                   addressLine2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                     default: Nigeria
 *                   postalCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: Checkout completed and order created
 *       400:
 *         description: Invalid checkout information
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Checkout conflict or insufficient wallet balance
 */
router.post(
    '/checkout',
    validate(checkoutSchema),
    checkoutOrder
);

/**
 * @swagger
 * /orders/my-orders:
 *   get:
 *     summary: Get the authenticated buyer's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Buyer orders retrieved
 *       401:
 *         description: Authentication required
 */
router.get('/my-orders', listBuyerOrders);

/**
 * @swagger
 * /orders/vendor-orders:
 *   get:
 *     summary: Get orders associated with the authenticated vendor
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor orders retrieved
 *       401:
 *         description: Authentication required
 */
router.get('/vendor-orders', listVendorOrders);

/**
 * @swagger
 * /orders/vendor-orders/{subOrderId}/status:
 *   patch:
 *     summary: Change a vendor order's status
 *     tags: [Orders]
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
 *             properties:
 *               status:
 *                 type: string
 *                 example: processing
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid order status transition
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Order not found
 */
router.patch(
    '/vendor-orders/:subOrderId/status',
    changeVendorOrderStatus
);

module.exports = router;
