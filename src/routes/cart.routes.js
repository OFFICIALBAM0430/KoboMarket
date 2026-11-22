
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    addCartItemSchema,
    updateCartItemSchema
} = require('../validators/cart.validator');

const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers/cart.controller');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Buyer shopping cart management
 */

router.use(protect);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get the authenticated buyer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved
 *       401:
 *         description: Authentication required
 */
router.get('/', getCart);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Add a product to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Cart item added
 *       400:
 *         description: Invalid product or quantity
 *       401:
 *         description: Authentication required
 */
router.post(
    '/items',
    validate(addCartItemSchema),
    addToCart
);

/**
 * @swagger
 * /cart/items/{productId}:
 *   patch:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Cart item updated
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Cart item not found
 */
router.patch(
    '/items/:productId',
    validate(updateCartItemSchema),
    updateCartItem
);

/**
 * @swagger
 * /cart/items/{productId}:
 *   delete:
 *     summary: Remove a product from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart item removed
 *       401:
 *         description: Authentication required
 */
router.delete('/items/:productId', removeFromCart);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Clear the authenticated buyer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 *       401:
 *         description: Authentication required
 */
router.delete('/', clearCart);

module.exports = router;
