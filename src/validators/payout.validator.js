
const Joi = require('joi');

const requestPayoutSchema = Joi.object({
    amountKobo: Joi.number()
        .integer()
        .min(100000)
        .max(Number.MAX_SAFE_INTEGER)
        .required(),

    idempotencyKey: Joi.string()
        .trim()
        .min(10)
        .max(150)
        .required(),

    accountNumber: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),

    bankCode: Joi.string()
        .trim()
        .min(2)
        .max(10)
        .required(),

    accountName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
});

module.exports = {
    requestPayoutSchema
};
