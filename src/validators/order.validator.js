
const Joi = require('joi');

const checkoutSchema = Joi.object({
    idempotencyKey: Joi.string()
        .trim()
        .min(10)
        .max(150)
        .required(),

    shippingAddress: Joi.object({
        fullName: Joi.string().trim().min(2).max(100).required(),

        phone: Joi.string().trim().min(7).max(20).required(),

        addressLine1: Joi.string().trim().min(5).max(200).required(),

        addressLine2: Joi.string().trim().max(200).allow(''),

        city: Joi.string().trim().min(2).max(100).required(),

        state: Joi.string().trim().min(2).max(100).required(),

        country: Joi.string().trim().min(2).max(100).default('Nigeria'),

        postalCode: Joi.string().trim().max(20).allow('')
    }).required()
});

module.exports = {
    checkoutSchema
};
          
