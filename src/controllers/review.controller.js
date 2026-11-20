
const reviewService = require('../services/review.service');

const handleError = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.statusCode ? 'REVIEW_ERROR' : 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Something went wrong',
            details: []
        }
    });
};

const createReview = async (req, res) => {
    try {
        const review = await reviewService.createReview(
            req.user._id,
            req.params.productId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const getProductReviews = async (req, res) => {
    try {
        const result = await reviewService.getProductReviews(
            req.params.productId,
            req.query
        );

        return res.status(200).json({
            success: true,
            count: result.reviews.length,
            data: result.reviews,
            summary: result.summary
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateReview = async (req, res) => {
    try {
        const review = await reviewService.updateReview(
            req.user._id,
            req.params.reviewId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: review
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteReview = async (req, res) => {
    try {
        await reviewService.deleteReview(
            req.user._id,
            req.params.reviewId
        );

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview
};
