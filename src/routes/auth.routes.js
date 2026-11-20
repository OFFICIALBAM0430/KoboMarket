
const express = require('express');
const router = express.Router();

const {
    registerSchema,
    verifyEmailSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} = require('../validators/auth.validator');

const { validate } = require('../middleware/validate.middleware');
const { loginLimiter } = require('../middleware/loginLimiter.middleware');
const { protect } = require('../middleware/auth.middleware');

const {
    registerUser,
    verifyEmail,
    loginUser,
    refreshAccessToken,
    logoutUser,
    logoutAllDevices,
    forgotPassword,
    resetPassword
} = require('../controllers/auth.controller');

router.post('/register', validate(registerSchema), registerUser);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/login', loginLimiter, validate(loginSchema), loginUser);
router.post('/refresh-token', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', validate(refreshTokenSchema), logoutUser);
router.post('/logout-all', protect, logoutAllDevices);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;
