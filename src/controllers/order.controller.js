
const { checkout } = require('../services/order.service');

const checkoutOrder = async (req, res, next) => {
    try {
        const result = await checkout({
            buyerId: req.user.id,
            idempotencyKey: req.body.idempotencyKey,
            shippingAddress: req.body.shippingAddress
        });

        return res.status(201).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkoutOrder
};
