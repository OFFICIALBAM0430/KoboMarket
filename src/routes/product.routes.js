
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    createProductSchema,
    updateProductSchema
} = require('../validators/product.validator');

const {
    createProduct,
    getMyProducts,
    getPublicProducts,
    getPublicProduct,
    updateProduct,
    archiveProduct
} = require('../controllers/product.controller');

router.get('/', getPublicProducts);
router.get('/mine', protect, authorize('vendor'), getMyProducts);
router.post(
    '/',
    protect,
    authorize('vendor'),
    validate(createProductSchema),
    createProduct
);
router.patch(
    '/:productId',
    protect,
    authorize('vendor'),
    validate(updateProductSchema),
    updateProduct
);
router.delete(
    '/:productId',
    protect,
    authorize('vendor'),
    archiveProduct
);
router.get('/:productId', getPublicProduct);

module.exports = router;
