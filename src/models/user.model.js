const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },

    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        minlength: 8
    },

    roles: {
        type: [{
            type: String,
            enum: ['buyer', 'vendor', 'admin']
        }],
        default: 'buyer'
    },

    tokenVersion: {
        type: Number,
        default: 0
    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    emailVerificationCode: {
        type: String,
        default: null
    },

    emailVerificationExpires: {
        type: Date,
        default: null
    },

    passwordResetToken: {
        type: String,
        default: null
    },

    passwordResetExpires: {
        type: Date,
        default: null
    },

    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'deactivated'],
        default: 'active'
    },

    lastLoginAt: {
        type: Date,
        default: null
    },

}, { timestamps: true, versionKey: false });

const User = mongoose.model('User', userSchema);

module.exports = User;
