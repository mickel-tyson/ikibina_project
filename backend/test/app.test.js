const request = require('supertest');
const app = require('../app');

describe('IKIBINA Backend Testing', () => {

    test('Test Home Route', async () => {

        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Backend Running Successfully');

    });

    test('Test Payment Route', async () => {

        const response = await request(app)
            .post('/payment')
            .send({
                amount: 5000,
                phone: '0788888888'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Payment Successful');

    });

});