
const mongoose = require('mongoose');

const vendorStoreSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    storeName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },

    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    description: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },

    logo: {
        type: String,
        default: null
    },

    banner: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'rejected'],
        default: 'pending'
    },

    rejectionReason: {
        type: String,
        default: null
    }

}, {
    timestamps: true,
    versionKey: false
});

const VendorStore = mongoose.model('VendorStore', vendorStoreSchema);

module.exports = VendorStore;
