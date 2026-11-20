
const db = require('../config/postgres');

const MAX_BIGINT = 9223372036854775807n;

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
const toKobo = (value) => {
    if (
        typeof value === 'number' &&
        !Number.isSafeInteger(value)
    ) {
        throw createError('Amount must be a safe integer in kobo');
    }

    if (
        typeof value !== 'number' &&
        typeof value !== 'string'
    ) {
        throw createError('Invalid kobo amount');
    }

    if (!/^\d+$/.test(String(value))) {
        throw createError('Amount must be a positive integer in kobo');
    }

    const amount = BigInt(value);

    if (amount <= 0n || amount > MAX_BIGINT) {
        throw createError('Amount is outside the supported range');
    }

    return amount;
};

const getTransactionDetails = async (trx, transactionId) => {
    const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first();

    const entries = await trx('ledger_entries')
        .where({ transaction_id: transactionId })
        .orderBy('id', 'asc');

    return { transaction, entries };
};

const postLedgerTransaction = async ({
    idempotencyKey,
    type,
    reference = null,
    description = null,
    metadata = {},
    entries
}) => {
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        throw createError('An idempotency key is required');
    }

    if (!type || typeof type !== 'string') {
        throw createError('Transaction type is required');
    }

    if (!Array.isArray(entries) || entries.length < 2) {
        throw createError('At least two ledger entries are required');
    }

    const normalizedEntries = entries.map((entry) => {
        if (!['debit', 'credit'].includes(entry.direction)) {
            throw createError('Entry direction must be debit or credit');
        }

        if (
            !Number.isSafeInteger(Number(entry.accountId)) ||
            Number(entry.accountId) <= 0
        ) {
            throw createError('Invalid account ID');
        }

        return {
            accountId: Number(entry.accountId),
            direction: entry.direction,
            amount: toKobo(entry.amountKobo)
        };
    });

    const totalDebits = normalizedEntries
        .filter((entry) => entry.direction === 'debit')
        .reduce((total, entry) => total + entry.amount, 0n);

    const totalCredits = normalizedEntries
        .filter((entry) => entry.direction === 'credit')
        .reduce((total, entry) => total + entry.amount, 0n);

    if (totalDebits === 0n || totalCredits === 0n) {
        throw createError('A transaction must contain debits and credits');
    }

    if (totalDebits !== totalCredits) {
        throw createError('Ledger transaction is not balanced');
    }

    const fingerprint = (items) => JSON.stringify(
        items.map((item) => ({
            accountId: item.accountId,
            direction: item.direction,
            amountKobo: item.amount.toString()
        })).sort((a, b) =>
            a.accountId - b.accountId ||
            a.direction.localeCompare(b.direction) ||
            a.amountKobo.localeCompare(b.amountKobo)
        )
    );

    const requestedFingerprint = fingerprint(normalizedEntries);

    return db.transaction(async (trx) => {
    
        const inserted = await trx('transactions')
            .insert({
                reference,
                type,
                status: 'pending',
                idempotency_key: idempotencyKey,
                metadata
            })
            .onConflict('idempotency_key')
            .ignore()
            .returning('id');

        if (inserted.length === 0) {
            const existing = await trx('transactions')
                .where({ idempotency_key: idempotencyKey })
                .first();

            if (!existing) {
                throw createError('Unable to retrieve existing transaction', 500);
            }

            if (existing.type !== type) {
                throw createError(
                    'Idempotency key was already used for another transaction',
                    409
                );
            }

            const existingEntries = await trx('ledger_entries')
                .where({ transaction_id: existing.id });

            const existingFingerprint = fingerprint(
                existingEntries.map((entry) => ({
                    accountId: Number(entry.account_id),
                    direction: entry.direction,
                    amountKobo: entry.amount_kobo
                }))
            );

            if (existingFingerprint !== requestedFingerprint) {
                throw createError(
                    'Idempotency key was reused with different transaction details',
                    409
                );
            }

            return {
                ...await getTransactionDetails(trx, existing.id),
                alreadyProcessed: true
            };
        }

        const transactionId = inserted[0].id;
      
        const balanceChanges = new Map();

        for (const entry of normalizedEntries) {
            const current = balanceChanges.get(entry.accountId) || 0n;

            balanceChanges.set(
                entry.accountId,
                current + (
                    entry.direction === 'credit'
                        ? entry.amount
                        : -entry.amount
                )
            );
        }

        const accountIds = [...balanceChanges.keys()].sort((a, b) => a - b);

        const accounts = await trx('accounts')
            .whereIn('id', accountIds)
            .orderBy('id', 'asc')
            .forUpdate();

        if (accounts.length !== accountIds.length) {
            throw createError('One or more financial accounts were not found', 404);
        }

        const accountMap = new Map(
            accounts.map((account) => [Number(account.id), account])
        );

        const currencies = new Set(accounts.map((account) => account.currency));

        if (currencies.size !== 1) {
            throw createError('All ledger accounts must use the same currency');
        }

        for (const account of accounts) {
            if (account.status !== 'active') {
                throw createError(
                    `Account ${account.id} is not active`,
                    409
                );
            }

            const change = balanceChanges.get(Number(account.id));
            const currentBalance = BigInt(account.balance_kobo);
            const newBalance = currentBalance + change;

            if (account.owner_type !== 'system' && newBalance < 0n) {
                throw createError(
                    `Insufficient funds in account ${account.id}`,
                    409
                );
            }

            if (
                newBalance > MAX_BIGINT ||
                newBalance < -MAX_BIGINT - 1n
            ) {
                throw createError(
                    'Account balance exceeds the supported range',
                    400
                );
            }
        }

        await trx('ledger_entries').insert(
            normalizedEntries.map((entry) => ({
                transaction_id: transactionId,
                account_id: entry.accountId,
                direction: entry.direction,
                amount_kobo: entry.amount.toString()
            }))
        );

        for (const accountId of accountIds) {
            const change = balanceChanges.get(accountId);

            if (change === 0n) continue;

            await trx('accounts')
                .where({ id: accountId })
                .update({
                    balance_kobo: trx.raw(
                        'balance_kobo + ?::bigint',
                        [change.toString()]
                    ),
                    updated_at: trx.fn.now()
                });
        }

        await trx('transactions')
            .where({ id: transactionId })
            .update({ status: 'posted' });

        return {
            ...await getTransactionDetails(trx, transactionId),
            alreadyProcessed: false
        };
    });
};

const getAccountBalance = async (accountId) => {
    const account = await db('accounts')
        .where({ id: accountId })
        .first();

    if (!account) {
        throw createError('Account not found', 404);
    }

    return {
        accountId: account.id,
        currency: account.currency,
        balanceKobo: account.balance_kobo,
        status: account.status
    };
};

module.exports = {
    postLedgerTransaction,
    getAccountBalance
};
