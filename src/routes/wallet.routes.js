
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { getMyWallet } = require('../controllers/wallet.controller');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Buyer wallet information and balance
 */

/**
 * @swagger
 * /wallet:
 *   get:
 *     summary: Get the authenticated user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     balanceKobo:
 *                       type: integer
 *                       description: Wallet balance in kobo
 *                     currency:
 *                       type: string
 *                       example: NGN
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Failed to retrieve wallet
 */
router.get('/', protect, getMyWallet);

module.exports = router;
