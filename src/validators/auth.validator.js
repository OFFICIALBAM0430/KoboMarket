const Joi = require('joi');
const registerSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().trim().email().lowercase().required(),
    password: Joi.string().min(8).max(128).required()
});
const verifyEmailSchema = Joi.object({
    email: Joi.string().trim().email().lowercase().required(),
    verificationCode: Joi.string().pattern(/^\d{6}$/).required()
});
const loginSchema = Joi.object({
    email: Joi.string().trim().email().lowercase().required(),
    password: Joi.string().required()
});
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});
const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().email().lowercase().required()
});
const resetPasswordSchema = Joi.object({
    email: Joi.string().trim().email().lowercase().required(),
    resetToken: Joi.string().length(64).hex().required(),
    newPassword: Joi.string().min(8).max(128).required()
});
module.exports = {
    registerSchema,
    verifyEmailSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};