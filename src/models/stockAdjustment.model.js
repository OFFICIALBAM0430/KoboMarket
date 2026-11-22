const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    reason: {
        type: String,
        required: true,
        enum: ['order_cancellation']
    },

    reference: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

const StockAdjustment = mongoose.model(
    'StockAdjustment',
    stockAdjustmentSchema
);

module.exports = StockAdjustment;
