
const Joi = require('joi');

const addCartItemSchema = Joi.object({
    productId: Joi.string().hex().length(24).required(),
    quantity: Joi.number().integer().min(1).max(100).required()
});

const updateCartItemSchema = Joi.object({
    quantity: Joi.number().integer().min(1).max(100).required()
});

module.exports = {
    addCartItemSchema,
    updateCartItemSchema
};
