
const db = require('../config/postgres');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUserAccount = async (userId, currency = 'NGN') => {
    if (!userId || typeof userId !== 'string') {
        throw createError('Valid user ID is required');
    }

    const account = await db('accounts')
        .where({
            owner_type: 'user',
            owner_id: userId,
            currency
        })
        .first();

    if (!account) {
        throw createError('User financial account not found', 404);
    }

    if (account.status !== 'active') {
        throw createError('User financial account is not active', 409);
    }

    return {
        id: String(account.id),
        userId: account.owner_id,
        currency: account.currency,
        balanceKobo: String(account.balance_kobo),
        status: account.status
    };
};

module.exports = { getUserAccount };
