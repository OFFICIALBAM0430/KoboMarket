
const Joi = require('joi');

const createVendorStoreSchema = Joi.object({
    storeName: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required(),

    description: Joi.string()
        .trim()
        .max(1000)
        .allow('')
        .default('')
});

const updateVendorStoreSchema = Joi.object({
    storeName: Joi.string()
        .trim()
        .min(3)
        .max(100),

    description: Joi.string()
        .trim()
        .max(1000)
        .allow('')
}).min(1);

module.exports = {
    createVendorStoreSchema,
    updateVendorStoreSchema
};
