
const productService = require('../services/product.service');

const handleError = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.statusCode ? 'PRODUCT_ERROR' : 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Something went wrong',
            details: []
        }
    });
};

const createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(
            req.user._id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const getMyProducts = async (req, res) => {
    try {
        const products = await productService.getMyProducts(
            req.user._id,
            req.query
        );

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const getPublicProducts = async (req, res) => {
    try {
        const result = await productService.getPublicProducts(req.query);

        return res.status(200).json({
            success: true,
            count: result.products.length,
            data: result.products,
            pagination: result.pagination
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const getPublicProduct = async (req, res) => {
    try {
        const product = await productService.getPublicProduct(
            req.params.productId
        );

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(
            req.user._id,
            req.params.productId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const archiveProduct = async (req, res) => {
    try {
        const product = await productService.archiveProduct(
            req.user._id,
            req.params.productId
        );

        return res.status(200).json({
            success: true,
            message: 'Product archived successfully',
            data: product
        });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    createProduct,
    getMyProducts,
    getPublicProducts,
    getPublicProduct,
    updateProduct,
    archiveProduct
};
