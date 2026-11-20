
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    addCartItemSchema,
    updateCartItemSchema
} = require('../validators/cart.validator');

const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers/cart.controller');

router.use(protect);
router.get('/', getCart);
router.post(
    '/items',
    validate(addCartItemSchema),
    addToCart
);
router.patch(
    '/items/:productId',
    validate(updateCartItemSchema),
    updateCartItem
);
router.delete('/items/:productId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
