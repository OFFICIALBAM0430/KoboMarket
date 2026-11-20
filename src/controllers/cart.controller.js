
const cartService = require('../services/cart.service');

const handleError = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.statusCode ? 'CART_ERROR' : 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Something went wrong',
            details: []
        }
    });
};

const getCart = async (req, res) => {
    try {
        const cart = await cartService.getCart(req.user._id);

        return res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const addToCart = async (req, res) => {
    try {
        const cart = await cartService.addToCart(
            req.user._id,
            req.body.productId,
            req.body.quantity
        );

        return res.status(200).json({
            success: true,
            message: 'Product added to cart',
            data: cart
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateCartItem = async (req, res) => {
    try {
        const cart = await cartService.updateCartItem(
            req.user._id,
            req.params.productId,
            req.body.quantity
        );

        return res.status(200).json({
            success: true,
            message: 'Cart quantity updated',
            data: cart
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const removeFromCart = async (req, res) => {
    try {
        const cart = await cartService.removeFromCart(
            req.user._id,
            req.params.productId
        );

        return res.status(200).json({
            success: true,
            message: 'Product removed from cart',
            data: cart
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const clearCart = async (req, res) => {
    try {
        const result = await cartService.clearCart(req.user._id);

        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};
