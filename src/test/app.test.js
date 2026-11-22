
const request = require('supertest');
const app = require('../app');

describe('KoboMarket API Tests', () => {

    describe('GET /', () => {
        it('should confirm that the API is running', async () => {
            const response = await request(app).get('/');

            expect(response.statusCode).toBe(200);
            expect(response.text).toBe('Kobomarket API is running');
        });
    });

    describe('POST /api/v1/auth/register', () => {
        it('should reject registration with missing fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should reject login with missing credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/verify-email', () => {
        it('should reject email verification with missing fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should reject refresh requests without a token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/forgot-password', () => {
        it('should reject requests without an email address', async () => {
            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/reset-password', () => {
        it('should reject password reset requests with missing fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

});
