
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const { checkoutSchema } = require('../validators/order.validator');

const {
    checkoutOrder,
    listBuyerOrders,
    listVendorOrders,
    changeVendorOrderStatus,
    cancelBuyerSubOrder
} = require('../controllers/order.controller');

router.use(protect);

router.patch(
    '/my-orders/:subOrderId/cancel',
    cancelBuyerSubOrder
);

router.post('/checkout', validate(checkoutSchema), checkoutOrder);

router.get('/my-orders', listBuyerOrders);

router.get('/vendor-orders', listVendorOrders);

router.patch('/vendor-orders/:subOrderId/status', changeVendorOrderStatus);

module.exports = router;
