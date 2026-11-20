
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorStore',
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },

    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },

    priceKobo: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isSafeInteger,
            message: 'Price must be a valid integer amount in kobo'
        }
    },

    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        validate: {
            validator: Number.isSafeInteger,
            message: 'Stock must be a whole number'
        }
    },

    category: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    images: {
        type: [String],
        default: []
    },

    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft'
    }

}, {
    timestamps: true,
    versionKey: false
});

productSchema.index(
    { store: 1, slug: 1 },
    { unique: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ priceKobo: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
