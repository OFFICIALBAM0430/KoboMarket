
const crypto = require('crypto');

const verifyPaystackWebhook = (req, res, next) => {
    const signature = req.headers['x-paystack-signature'];

    if (!signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid webhook request'
        });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
        return res.status(500).json({
            success: false,
            message: 'Payment provider configuration error'
        });
    }

    const expectedSignature = crypto
        .createHmac('sha512', secret)
        .update(req.body)
        .digest('hex');

    const received = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');

    if (
        received.length !== expected.length ||
        !crypto.timingSafeEqual(received, expected)
    ) {
        return res.status(401).json({
            success: false,
            message: 'Invalid webhook signature'
        });
    }

    try {
        req.body = JSON.parse(req.body.toString('utf8'));
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid webhook payload'
        });
    }
};

module.exports = { verifyPaystackWebhook };
