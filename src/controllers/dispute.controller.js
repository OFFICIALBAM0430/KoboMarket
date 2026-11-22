
const {
    openDispute,
    resolveDispute
} = require('../services/dispute.service');

const createErrorResponse = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.statusCode === 400
                ? 'VALIDATION_ERROR'
                : 'DISPUTE_ERROR',
            message: error.message || 'An unexpected error occurred'
        }
    });
};

const openOrderDispute = async (req, res) => {
    try {
        const dispute = await openDispute({
            buyerId: req.user.id,
            subOrderId: req.params.subOrderId,
            reason: req.body.reason,
            description: req.body.description
        });

        return res.status(201).json({
            success: true,
            message: 'Dispute opened successfully',
            data: dispute
        });
    } catch (error) {
        return createErrorResponse(res, error);
    }
};

const resolveOrderDispute = async (req, res) => {
    try {
        const result = await resolveDispute({
            disputeId: req.params.disputeId,
            adminId: req.user.id,
            resolution: req.body.resolution,
            refundAmountKobo: req.body.refundAmountKobo,
            adminNote: req.body.adminNote
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        return createErrorResponse(res, error);
    }
};

module.exports = {
    openOrderDispute,
    resolveOrderDispute
};
