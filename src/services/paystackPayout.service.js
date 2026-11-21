
const axios = require('axios');

const paystack = axios.create({
    baseURL: 'https://api.paystack.co',
    timeout: 30000,
    headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
    }
});

const createTransferRecipient = async ({
    accountName,
    accountNumber,
    bankCode
}) => {
    if (
        !accountName ||
        !/^\d{10}$/.test(String(accountNumber)) ||
        !bankCode
    ) {
        throw new Error('Valid Nigerian bank details are required');
    }

    try {
        const response = await paystack.post('/transferrecipient', {
            type: 'nuban',
            name: accountName,
            account_number: String(accountNumber),
            bank_code: String(bankCode),
            currency: 'NGN'
        });

        if (!response.data.status) {
            throw new Error(
                response.data.message || 'Could not create transfer recipient'
            );
        }

        return {
            recipientCode: response.data.data.recipient_code,
            recipientName: response.data.data.name
        };
    } catch (error) {
        throw new Error(
            error.response?.data?.message ||
            error.message ||
            'Paystack recipient creation failed'
        );
    }
};

const initiateBankTransfer = async ({
    amountKobo,
    recipientCode,
    reference,
    reason = 'KoboMarket vendor payout'
}) => {
    if (
        !Number.isSafeInteger(amountKobo) ||
        amountKobo <= 0
    ) {
        throw new Error('Invalid transfer amount');
    }

    if (!recipientCode || !reference) {
        throw new Error('Recipient code and reference are required');
    }

    try {
        const response = await paystack.post('/transfer', {
            source: 'balance',
            amount: amountKobo,
            recipient: recipientCode,
            reference,
            reason
        });

        if (!response.data.status) {
            throw new Error(
                response.data.message || 'Bank transfer could not be initiated'
            );
        }

        return {
            transferCode: response.data.data.transfer_code,
            reference: response.data.data.reference,
            status: response.data.data.status,
            amountKobo: response.data.data.amount
        };
    } catch (error) {
        throw new Error(
            error.response?.data?.message ||
            error.message ||
            'Paystack transfer failed'
        );
    }
};

module.exports = {
    createTransferRecipient,
    initiateBankTransfer
};
