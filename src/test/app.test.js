
const request = require('supertest');
const app = require('../app');

describe('KoboMarket API Tests', () => {
    describe('API Health', () => {
        it('should confirm that the API is running', async () => {
            const response = await request(app).get('/');

            expect(response.statusCode).toBe(200);
            expect(response.text).toBe('Kobomarket API is running');
        });
    });

    describe('Authentication Validation', () => {
        const validationTests = [
            { name: 'registration', path: '/api/v1/auth/register' },
            { name: 'login', path: '/api/v1/auth/login' },
            { name: 'email verification', path: '/api/v1/auth/verify-email' },
            { name: 'token refresh', path: '/api/v1/auth/refresh-token' },
            { name: 'forgot password', path: '/api/v1/auth/forgot-password' },
            { name: 'password reset', path: '/api/v1/auth/reset-password' }
        ];

        it.each(validationTests)(
            'should reject $name requests with missing fields',
            async ({ path }) => {
                const response = await request(app)
                    .post(path)
                    .send({});

                expect(response.statusCode).toBe(400);
                expect(response.body.success).toBe(false);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            }
        );
    });

    describe('Authorization Protection', () => {
        const protectedEndpoints = [
            { name: 'wallet', path: '/api/v1/wallet' },
            { name: 'cart', path: '/api/v1/cart' },
            { name: 'buyer orders', path: '/api/v1/orders/my-orders' },
            { name: 'vendor orders', path: '/api/v1/orders/vendor-orders' },
            { name: 'vendor products', path: '/api/v1/products/mine' }
        ];

        it.each(protectedEndpoints)(
            'should reject unauthenticated access to $name',
            async ({ path }) => {
                const response = await request(app).get(path);

                expect(response.statusCode).toBe(401);
                expect(response.body.success).toBe(false);
            }
        );
    });
});
