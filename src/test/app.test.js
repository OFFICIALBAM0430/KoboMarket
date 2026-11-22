
const request = require('supertest');
const app = require('../app');

describe('KoboMarket API', () => {
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
        });
    });
});
