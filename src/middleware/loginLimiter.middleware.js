
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    
    limit: 5,


    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,

    keyGenerator: (req) => {
        const email = String(req.body.email)
            .trim()
            .toLowerCase();

        const ip = ipKeyGenerator(req.ip);

        return `login:${email}:${ip}`;
    },

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_LOGIN_ATTEMPTS',
                message: 'Too many failed login attempts. Please try again after 15 minutes.',
                details: []
            }
        });
    }
});

module.exports = { loginLimiter };
