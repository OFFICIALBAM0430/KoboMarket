const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { getMyWallet } = require('../controllers/wallet.controller');

router.get('/', protect, getMyWallet);

module.exports = router;