
const Joi = require('joi');

const openDisputeSchema = Joi.object({
    reason: Joi.string().trim().min(5).max(150).required(),

    description: Joi.string().trim().min(10).max(2000).required()
});

const resolveDisputeSchema = Joi.object({
    resolution: Joi.string()
        .valid('full_refund', 'partial_refund', 'rejected')
        .required(),

    refundAmountKobo: Joi.when('resolution', {
        is: 'partial_refund',
        then: Joi.number().integer().positive().required(),
        otherwise: Joi.forbidden()
    }),

    adminNote: Joi.string().trim().max(2000).allow('').default('')
});

module.exports = {
    openDisputeSchema,
    resolveDisputeSchema
};
