
const Joi = require('joi');

const createProductSchema = Joi.object({
    name: Joi.string().trim().min(3).max(150).required(),

    description: Joi.string().trim().min(10).max(5000).required(),

    priceKobo: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),

    stock: Joi.number().integer().min(0).required(),

    category: Joi.string().trim().min(2).max(100).required(),

    images: Joi.array()
        .items(Joi.string().uri())
        .max(10)
        .default([])
});

const updateProductSchema = Joi.object({
    name: Joi.string().trim().min(3).max(150),

    description: Joi.string().trim().min(10).max(5000),

    priceKobo: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER),

    stock: Joi.number().integer().min(0),

    category: Joi.string().trim().min(2).max(100),

    images: Joi.array()
        .items(Joi.string().uri())
        .max(10),

    status: Joi.string().valid('draft', 'active', 'archived')
}).min(1);

module.exports = {
    createProductSchema,
    updateProductSchema
};
