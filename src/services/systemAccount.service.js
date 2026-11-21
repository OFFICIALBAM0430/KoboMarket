
const db = require('../config/postgres');

const SYSTEM_ACCOUNT_CODES = [
    'PLATFORM_ESCROW',
    'PLATFORM_REVENUE',
    'PLATFORM_PAYOUT_CLEARING'
];

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getSystemAccount = async (accountCode, currency = 'NGN') => {
    if (!SYSTEM_ACCOUNT_CODES.includes(accountCode)) {
        throw createError('Invalid system account code');
    }

    const account = await db('accounts')
        .where({
            owner_type: 'system',
            owner_id: accountCode,
            currency
        })
        .first();

    if (!account) {
        throw createError(
            `System account ${accountCode} was not found`,
            404
        );
    }

    if (account.status !== 'active') {
        throw createError(
            `System account ${accountCode} is not active`,
            409
        );
    }

    return {
        id: String(account.id),
        code: account.owner_id,
        currency: account.currency,
        balanceKobo: String(account.balance_kobo),
        status: account.status
    };
};

const getAllSystemAccounts = async (currency = 'NGN') => {
    const accounts = await db('accounts')
        .where({
            owner_type: 'system',
            currency
        })
        .whereIn('owner_id', SYSTEM_ACCOUNT_CODES)
        .orderBy('id', 'asc');

    return accounts.map((account) => ({
        id: String(account.id),
        code: account.owner_id,
        currency: account.currency,
        balanceKobo: String(account.balance_kobo),
        status: account.status
    }));
};

module.exports = {
    getSystemAccount,
    getAllSystemAccounts,
    SYSTEM_ACCOUNT_CODES
};
