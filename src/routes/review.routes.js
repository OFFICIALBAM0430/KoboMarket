
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    createReviewSchema,
    updateReviewSchema
} = require('../validators/review.validator');

const {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview
} = require('../controllers/review.controller');

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product ratings and customer reviews
 */

/**
 * @swagger
 * /products/{productId}/reviews:
 *   get:
 *     summary: Get reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product reviews retrieved
 *       404:
 *         description: Product not found
 */
router.get(
    '/products/:productId/reviews',
    getProductReviews
);

/**
 * @swagger
 * /products/{productId}/reviews:
 *   post:
 *     summary: Create a product review
 *     description: Requires authentication and a completed purchase of the product.
 *     tags: [Reviews]
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Invalid review data
 *       401:
 *         description: Authentication required
 */
router.post(
    '/products/:productId/reviews',
    protect,
    validate(createReviewSchema),
    createReview
);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Update an existing review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Review updated
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 */
router.patch(
    '/reviews/:reviewId',
    protect,
    validate(updateReviewSchema),
    updateReview
);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   delete:
 *     summary: Delete an existing review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 */
router.delete(
    '/reviews/:reviewId',
    protect,
    deleteReview
);

module.exports = router;
