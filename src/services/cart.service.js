
const mongoose = require('mongoose');

const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getAvailableProduct = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const product = await Product.findOne({
        _id: productId,
        status: 'active'
    }).populate({
        path: 'store',
        match: { status: 'active' }
    });

    if (!product || !product.store) {
        throw createError('Product is unavailable', 404);
    }

    return product;
};

const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        try {
            cart = await Cart.create({
                user: userId,
                items: []
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            cart = await Cart.findOne({ user: userId });
        }
    }

    return cart;
};

const getCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    await cart.populate({
        path: 'items.product',
        select: 'name slug priceKobo stock images status store',
        populate: {
            path: 'store',
            select: 'storeName slug status'
        }
    });

    let subtotalKobo = 0;

    const items = cart.items
        .filter((item) => {
            const product = item.product;
            return product &&
                product.status === 'active' &&
                product.store &&
                product.store.status === 'active';
        })
        .map((item) => {
            const product = item.product;
            const lineTotalKobo = product.priceKobo * item.quantity;

            subtotalKobo += lineTotalKobo;

            return {
                product,
                quantity: item.quantity,
                lineTotalKobo
            };
        });

    return {
        cartId: cart._id,
        items,
        itemCount: items.reduce(
            (total, item) => total + item.quantity,
            0
        ),
        subtotalKobo
    };
};

const addToCart = async (userId, productId, quantity) => {
    const product = await getAvailableProduct(productId);

    const cart = await getOrCreateCart(userId);

    const existingItem = cart.items.find(
        (item) => item.product.toString() === product._id.toString()
    );

    const newQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

    if (newQuantity > product.stock) {
        throw createError(
            `Only ${product.stock} units are currently available`,
            409
        );
    }

    if (existingItem) {
        existingItem.quantity = newQuantity;
    } else {
        cart.items.push({
            product: product._id,
            quantity
        });
    }

    await cart.save();

    return getCart(userId);
};

const updateCartItem = async (userId, productId, quantity) => {
    const product = await getAvailableProduct(productId);

    if (quantity > product.stock) {
        throw createError(
            `Only ${product.stock} units are currently available`,
            409
        );
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        throw createError('Cart not found', 404);
    }

    const item = cart.items.find(
        (entry) => entry.product.toString() === productId
    );

    if (!item) {
        throw createError('Product is not in your cart', 404);
    }

    item.quantity = quantity;

    await cart.save();

    return getCart(userId);
};

const removeFromCart = async (userId, productId) => {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        throw createError('Cart not found', 404);
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
    );

    if (cart.items.length === initialLength) {
        throw createError('Product is not in your cart', 404);
    }

    await cart.save();

    return getCart(userId);
};

const clearCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    cart.items = [];

    await cart.save();

    return {
        message: 'Cart cleared successfully'
    };
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};
          
