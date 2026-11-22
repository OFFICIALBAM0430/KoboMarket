
const mongoose = require('mongoose');

const Review = require('../models/review.model');
const Product = require('../models/product.model');

const db = require('../config/postgres');

const hasCompletedPurchase = async (buyerId, productId) => {
    const purchase = await db('order_items as oi')
        .join('sub_orders as so', 'so.id', 'oi.sub_order_id')
        .join('orders as o', 'o.id', 'so.order_id')
        .where('o.buyer_id', buyerId)
        .where('oi.product_id', productId)
        .where('so.status', 'completed')
        .first('oi.id');

    return Boolean(purchase);
};

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const createReview = async (userId, productId, reviewData) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const product = await Product.findOne({
        _id: productId,
        status: 'active'
    });

    if (!product) {
        throw createError('Product not found', 404);
    }

    const hasPurchased = await hasCompletedPurchase(
    userId,
    productId
);

if (!hasPurchased) {
    throw createError(
        'You can only review products you have purchased and received',
        403
    );
}

    const existingReview = await Review.findOne({
        product: productId,
        user: userId
    });

    if (existingReview) {
        throw createError('You have already reviewed this product', 409);
    }

    try {
        return await Review.create({
            product: productId,
            user: userId,
            rating: reviewData.rating,
            comment: reviewData.comment || ''
        });
    } catch (error) {
        if (error.code === 11000) {
            throw createError(
                'You have already reviewed this product',
                409
            );
        }

        throw error;
    }
};

const getProductReviews = async (productId, query = {}) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const product = await Product.findOne({
        _id: productId,
        status: 'active'
    });

    if (!product) {
        throw createError('Product not found', 404);
    }

    const limit = Math.min(
        Math.max(parseInt(query.limit, 10) || 20, 1),
        50
    );

    const filter = { product: productId };

    const reviews = await Review.find(filter)
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit);

    const statistics = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    const summary = statistics[0] || {
        averageRating: 0,
        totalReviews: 0
    };

    return {
        reviews,
        summary: {
            averageRating: Number(summary.averageRating.toFixed(1)),
            totalReviews: summary.totalReviews
        }
    };
};

const updateReview = async (userId, reviewId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw createError('Invalid review ID');
    }

    const allowedUpdates = {};

    if (updateData.rating !== undefined) {
        allowedUpdates.rating = updateData.rating;
    }

    if (updateData.comment !== undefined) {
        allowedUpdates.comment = updateData.comment;
    }

    if (Object.keys(allowedUpdates).length === 0) {
        throw createError('Provide a valid rating or comment to update');
    }

    const review = await Review.findOneAndUpdate(
        {
            _id: reviewId,
            user: userId
        },
        { $set: allowedUpdates },
        {
            new: true,
            runValidators: true
        }
    );

    if (!review) {
        throw createError('Review not found or you do not own it', 404);
    }

    return review;
};

const deleteReview = async (userId, reviewId) => {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw createError('Invalid review ID');
    }

    const review = await Review.findOneAndDelete({
        _id: reviewId,
        user: userId
    });

    if (!review) {
        throw createError('Review not found or you do not own it', 404);
    }

    return review;
};

module.exports = {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview
};
        
