
const db = require('../config/postgres');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const reconcileAllAccounts = async () => {
    const accounts = await db('accounts as a')
        .leftJoin('ledger_entries as le', 'a.id', 'le.account_id')
        .select(
            'a.id as account_id',
            'a.owner_type',
            'a.owner_id',
            'a.currency',
            'a.balance_kobo as account_balance_kobo',
            'a.status'
        )
        .select(
            db.raw(`
                COALESCE(
                    SUM(
                        CASE
                            WHEN le.direction = 'credit'
                                THEN le.amount_kobo
                            WHEN le.direction = 'debit'
                                THEN -le.amount_kobo
                            ELSE 0
                        END
                    ),
                    0
                )::text AS ledger_balance_kobo
            `)
        )
        .groupBy(
            'a.id',
            'a.owner_type',
            'a.owner_id',
            'a.currency',
            'a.balance_kobo',
            'a.status'
        )
        .orderBy('a.id', 'asc');

    const results = accounts.map((account) => {
        const accountBalance = BigInt(account.account_balance_kobo);
        const ledgerBalance = BigInt(account.ledger_balance_kobo);

        const difference = accountBalance - ledgerBalance;

        return {
            accountId: String(account.account_id),
            ownerType: account.owner_type,
            ownerId: account.owner_id,
            currency: account.currency,
            accountBalanceKobo: accountBalance.toString(),
            ledgerBalanceKobo: ledgerBalance.toString(),
            differenceKobo: difference.toString(),
            status: account.status,
            reconciled: difference === 0n
        };
    });

    const reconciledCount = results.filter(
        (account) => account.reconciled
    ).length;

    const discrepancyCount = results.length - reconciledCount;

    return {
        success: discrepancyCount === 0,
        summary: {
            totalAccounts: results.length,
            reconciledAccounts: reconciledCount,
            accountsWithDiscrepancies: discrepancyCount
        },
        accounts: results
    };
};

const reconcileAccount = async (accountId) => {
    if (!/^[1-9]\d*$/.test(String(accountId))) {
        throw createError('Invalid account ID');
    }

    const result = await reconcileAllAccounts();

    const account = result.accounts.find(
        (item) => item.accountId === String(accountId)
    );

    if (!account) {
        throw createError('Account not found', 404);
    }

    return {
        success: account.reconciled,
        account
    };
};

module.exports = {
    reconcileAllAccounts,
    reconcileAccount
};
