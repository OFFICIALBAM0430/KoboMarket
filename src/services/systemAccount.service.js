
const db = require('../config/postgres');

const SYSTEM_ACCOUNT_CODES = [
    'PLATFORM_ESCROW',
    'PLATFORM_REVENUE',
    'PLATFORM_PAYOUT_CLEARING',
    'PLATFORM_PAYOUT_SETTLED'
];

const getSystemAccount = async (
    accountCode,
    currency = 'NGN'
) => {
    if (!SYSTEM_ACCOUNT_CODES.includes(accountCode)) {
        throw new Error('Invalid system account code');
    }

    const account = await db('accounts')
        .where({
            owner_type: 'system',
            owner_id: accountCode,
            currency
        })
        .first();

    if (!account) {
        throw new Error(
            `System account ${accountCode} was not found`
        );
    }

    if (account.status !== 'active') {
        throw new Error(
            `System account ${accountCode} is not active`
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

const getAllSystemAccounts = async () => {
    return db('accounts')
        .where({
            owner_type: 'system'
        })
        .select(
            'id',
            'owner_id',
            'currency',
            'balance_kobo',
            'status'
        );
};

module.exports = {
    getSystemAccount,
    getAllSystemAccounts
};
