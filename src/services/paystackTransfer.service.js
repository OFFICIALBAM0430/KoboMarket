
const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';


const normalizePaystackError = (error, fallbackMessage) => {
    const normalizedError = new Error(
        error.response?.data?.message ||
        error.message ||
        fallbackMessage
    );

    if (error.response) {
        normalizedError.response = error.response;
        normalizedError.statusCode = error.response.status;
    }

    return normalizedError;
};

const paystackRequest = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    timeout: 15000,
    headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
    }
});

const resolveBankAccount = async ({ accountNumber, bankCode }) => {
    try {
        const response = await paystackRequest.get('/bank/resolve', {
            params: {
                account_number: accountNumber,
                bank_code: bankCode
            }
        });

        if (!response.data.status || !response.data.data.account_name) {
            throw new Error('Unable to verify bank account');
        }

        return response.data.data;
    } catch (error) {
        throw normalizePaystackError(
    error,
    'Bank account verification failed'
);
    }
};

const createTransferRecipient = async ({
    accountNumber,
    bankCode,
    accountName,
    email
}) => {
    try {
        const response = await paystackRequest.post(
            '/transferrecipient',
            {
                type: 'nuban',
                name: accountName,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: 'NGN',
                email
            }
        );

        if (
            !response.data.status ||
            !response.data.data.recipient_code
        ) {
            throw new Error('Paystack recipient creation failed');
        }

        return response.data.data;
    } catch (error) {
        throw normalizePaystackError(
    error,
    'Unable to create transfer recipient'
);
    }
};

const initiateTransfer = async ({
    amountKobo,
    recipientCode,
    reference,
    reason
}) => {
    try {
        const response = await paystackRequest.post('/transfer', {
            source: 'balance',
            amount: amountKobo,
            currency: 'NGN',
            recipient: recipientCode,
            reference,
            reason
        });

        if (
            !response.data.status ||
            !response.data.data
        ) {
            throw new Error('Paystack transfer initiation failed');
        }

        return response.data.data;
    } catch (error) {
        throw normalizePaystackError(
    error,
    'Unable to initiate Paystack transfer'
);
    }
};

module.exports = {
    resolveBankAccount,
    createTransferRecipient,
    initiateTransfer
};
