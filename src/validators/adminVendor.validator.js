
const Joi = require('joi');

const rejectVendorStoreSchema = Joi.object({
    reason: Joi.string().trim().min(5).max(500).required()
});

module.exports = { rejectVendorStoreSchema };
