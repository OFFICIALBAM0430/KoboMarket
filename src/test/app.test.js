
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
            {
                name: 'registration',
                method: 'post',
                path: '/api/v1/auth/register'
            },
            {
                name: 'login',
                method: 'post',
                path: '/api/v1/auth/login'
            },
            {
                name: 'email verification',
                method: 'post',
                path: '/api/v1/auth/verify-email'
            },
            {
                name: 'token refresh',
                method: 'post',
                path: '/api/v1/auth/refresh-token'
            },
            {
                name: 'forgot password',
                method: 'post',
                path: '/api/v1/auth/forgot-password'
            },
            {
                name: 'password reset',
                method: 'post',
                path: '/api/v1/auth/reset-password'
            }
        ];

        it.each(validationTests)(
            'should reject $name requests with missing fields',
            async ({ method, path }) => {
                const response = await request(app)
                    [method](path)
                    .send({});

                expect(response.statusCode).toBe(400);
                expect(response.body.success).toBe(false);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            }
        );
    });

    describe('Authorization Protection', () => {

        const protectedEndpoints = [
            {
                name: 'wallet',
                method: 'get',
                path: '/api/v1/wallet'
            },
            {
                name: 'cart',
                method: 'get',
                path: '/api/v1/cart'
            },
            {
                name: 'buyer orders',
                method: 'get',
                path: '/api/v1/orders/my-orders'
            },
            {
                name: 'vendor orders',
                method: 'get',
                path: '/api/v1/orders/vendor-orders'
            },
            {
                name: 'vendor products',
                method: 'get',
                path: '/api/v1/products/mine'
            }
        ];

        it.each(protectedEndpoints)(
            'should reject unauthenticated access to $name',
            async ({ method, path }) => {
                const response = await request(app)
                    [method](path);

                expect(response.statusCode).toBe(401);
                expect(response.body.success).toBe(false);
            }
        );
    });

});
