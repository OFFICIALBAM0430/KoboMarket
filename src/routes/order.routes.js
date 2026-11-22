
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    checkoutSchema
} = require('../validators/order.validator');

const {
    checkoutOrder
} = require('../controllers/order.controller');

router.post(
    '/checkout',
    protect,
    validate(checkoutSchema),
    checkoutOrder
);

module.exports = router;
