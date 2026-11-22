
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

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product discovery and vendor product management
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get public products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Minimum price in kobo
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Maximum price in kobo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public product listing
 */
router.get('/', getPublicProducts);

/**
 * @swagger
 * /products/mine:
 *   get:
 *     summary: Get products belonging to the authenticated vendor
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor products retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Vendor permission required
 */
router.get('/mine', protect, authorize('vendor'), getMyProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - priceKobo
 *               - stock
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wireless Headphones
 *               description:
 *                 type: string
 *               priceKobo:
 *                 type: integer
 *                 example: 2500000
 *               stock:
 *                 type: integer
 *                 example: 20
 *               category:
 *                 type: string
 *                 example: Electronics
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Invalid product data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Vendor permission required
 */
router.post(
    '/',
    protect,
    authorize('vendor'),
    validate(createProductSchema),
    createProduct
);

/**
 * @swagger
 * /products/{productId}:
 *   patch:
 *     summary: Update a vendor product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               priceKobo:
 *                 type: integer
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 */
router.patch(
    '/:productId',
    protect,
    authorize('vendor'),
    validate(updateProductSchema),
    updateProduct
);

/**
 * @swagger
 * /products/{productId}:
 *   delete:
 *     summary: Archive a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product archived
 *       404:
 *         description: Product not found
 */
router.delete(
    '/:productId',
    protect,
    authorize('vendor'),
    archiveProduct
);

/**
 * @swagger
 * /products/{productId}:
 *   get:
 *     summary: Get a single public product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:productId', getPublicProduct);

module.exports = router;
