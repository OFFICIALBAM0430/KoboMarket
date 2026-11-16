const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.'
            });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );
        if (decoded.tokenType !== 'access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }
        const user = await User.findById(decoded.userId)
            .select('_id firstName lastName email roles accountStatus isEmailVerified tokenVersion');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User account not found'
            });
        }

        if (decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({success: false, message: 'Session expired. Pleae log in again.'});
        }
        if (user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active'
            });
        }
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first'
            });
        }
        req.user = user;
        next();
    } catch (error) {
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};
module.exports = { protect };