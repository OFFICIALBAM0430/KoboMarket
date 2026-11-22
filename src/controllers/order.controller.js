
const {
    checkout,
    getBuyerOrders,
    getVendorOrders,
    updateVendorOrderStatus
} = require('../services/order.service');

const checkoutOrder = async (req, res, next) => {
    try {
        const result = await checkout({
            buyerId: req.user.id,
            idempotencyKey: req.body.idempotencyKey,
            shippingAddress: req.body.shippingAddress
        });

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const listBuyerOrders = async (req, res, next) => {
    try {
        const orders = await getBuyerOrders(req.user.id);

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        next(error);
    }
};

const listVendorOrders = async (req, res, next) => {
    try {
        const orders = await getVendorOrders(req.user.id);

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        next(error);
    }
};

const changeVendorOrderStatus = async (req, res, next) => {
    try {
        const order = await updateVendorOrderStatus({
            vendorId: req.user.id,
            subOrderId: req.params.subOrderId,
            status: req.body.status
        });

        return res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkoutOrder,
    listBuyerOrders,
    listVendorOrders,
    changeVendorOrderStatus
};
