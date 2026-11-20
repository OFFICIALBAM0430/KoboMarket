
const mongoose = require('mongoose');
const slugify = require('slugify');

const Product = require('../models/product.model');
const VendorStore = require('../models/vendorStore.model');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const generateUniqueSlug = async (storeId, name, excludeProductId = null) => {
    const baseSlug = slugify(name, {
        lower: true,
        strict: true,
        trim: true
    });

    let slug = baseSlug;
    let count = 1;

    while (await Product.exists({
        store: storeId,
        slug,
        ...(excludeProductId && { _id: { $ne: excludeProductId } })
    })) {
        slug = `${baseSlug}-${count}`;
        count++;
    }

    return slug;
};

const createProduct = async (userId, productData) => {
    const store = await VendorStore.findOne({
        owner: userId
    });

    if (!store) {
        throw createError('Create a vendor store first', 404);
    }

    if (store.status !== 'active') {
        throw createError(
            'Your vendor store must be approved before you can add products',
            403
        );
    }

    const slug = await generateUniqueSlug(store._id, productData.name);

    return Product.create({
        store: store._id,
        ...productData,
        slug,
        status: 'draft'
    });
};

const getMyProducts = async (userId, query = {}) => {
    const store = await VendorStore.findOne({ owner: userId });

    if (!store) {
        throw createError('Vendor store not found', 404);
    }

    const filter = { store: store._id };

    if (query.status) {
        filter.status = query.status;
    }

    const products = await Product.find(filter)
        .sort({ _id: -1 })
        .limit(100);

    return products;
};

const getPublicProducts = async (query = {}) => {
    const limit = Math.min(
        Math.max(parseInt(query.limit, 10) || 20, 1),
        50
    );

    const filter = {
        status: 'active',
        store: {
            $in: await VendorStore.distinct('_id', { status: 'active' })
        }
    };

    if (query.category) {
        filter.category = String(query.category).trim().toLowerCase();
    }

    if (query.minPriceKobo !== undefined || query.maxPriceKobo !== undefined) {
        filter.priceKobo = {};

        if (query.minPriceKobo !== undefined) {
            const min = Number(query.minPriceKobo);

            if (!Number.isSafeInteger(min) || min < 0) {
                throw createError('Invalid minimum price filter');
            }

            filter.priceKobo.$gte = min;
        }

        if (query.maxPriceKobo !== undefined) {
            const max = Number(query.maxPriceKobo);

            if (!Number.isSafeInteger(max) || max < 0) {
                throw createError('Invalid maximum price filter');
            }

            filter.priceKobo.$lte = max;
        }

        if (
            filter.priceKobo.$gte !== undefined &&
            filter.priceKobo.$lte !== undefined &&
            filter.priceKobo.$gte > filter.priceKobo.$lte
        ) {
            throw createError('Minimum price cannot exceed maximum price');
        }
    }

    if (query.search) {
        filter.$text = {
            $search: String(query.search).trim()
        };
    }

    if (query.cursor) {
        if (!mongoose.Types.ObjectId.isValid(query.cursor)) {
            throw createError('Invalid pagination cursor');
        }

        filter._id = { $lt: query.cursor };
    }

    const products = await Product.find(filter)
        .populate('store', 'storeName slug')
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('-__v');

    const hasMore = products.length > limit;

    if (hasMore) {
        products.pop();
    }

    return {
        products,
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore
                ? products[products.length - 1]._id
                : null
        }
    };
};

const getPublicProduct = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const product = await Product.findOne({
        _id: productId,
        status: 'active'
    }).populate({
        path: 'store',
        match: { status: 'active' },
        select: 'storeName slug description logo'
    });

    if (!product || !product.store) {
        throw createError('Product not found', 404);
    }

    return product;
};

const updateProduct = async (userId, productId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const store = await VendorStore.findOne({ owner: userId });

    if (!store) {
        throw createError('Vendor store not found', 404);
    }

    if (store.status !== 'active') {
        throw createError('Your vendor store is not active', 403);
    }

    const product = await Product.findOne({
        _id: productId,
        store: store._id
    });

    if (!product) {
        throw createError('Product not found or you do not own it', 404);
    }

    if (updateData.name && updateData.name !== product.name) {
        product.slug = await generateUniqueSlug(
            store._id,
            updateData.name,
            product._id
        );
    }

    Object.assign(product, updateData);

    await product.save();

    return product;
};

const archiveProduct = async (userId, productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('Invalid product ID');
    }

    const store = await VendorStore.findOne({ owner: userId });

    if (!store) {
        throw createError('Vendor store not found', 404);
    }

    const product = await Product.findOneAndUpdate(
        {
            _id: productId,
            store: store._id
        },
        { status: 'archived' },
        { new: true }
    );

    if (!product) {
        throw createError('Product not found or you do not own it', 404);
    }

    return product;
};

module.exports = {
    createProduct,
    getMyProducts,
    getPublicProducts,
    getPublicProduct,
    updateProduct,
    archiveProduct
};
                    
