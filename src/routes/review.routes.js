
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


router.get(
    '/products/:productId/reviews',
    getProductReviews
);
router.post(
    '/products/:productId/reviews',
    protect,
    validate(createReviewSchema),
    createReview
);
router.patch(
    '/reviews/:reviewId',
    protect,
    validate(updateReviewSchema),
    updateReview
);
router.delete(
    '/reviews/:reviewId',
    protect,
    deleteReview
);

module.exports = router;
