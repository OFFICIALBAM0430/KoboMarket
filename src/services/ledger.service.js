
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

const normalizeId = (value) => {
    if (
        typeof value === 'number' &&
        !Number.isSafeInteger(value)
    ) {
        throw createError('Account ID must not exceed safe integer precision');
    }

    const id = String(value);

    if (!/^[1-9]\d*$/.test(id) || BigInt(id) > MAX_BIGINT) {
        throw createError('Invalid account ID');
    }

    return id;
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

const createFingerprint = (items) => {
    return JSON.stringify(
        items.map((item) => ({
            accountId: String(item.accountId),
            direction: item.direction,
            amountKobo: String(item.amountKobo)
        })).sort((a, b) => {
            const accountDifference =
                BigInt(a.accountId) - BigInt(b.accountId);

            if (accountDifference !== 0n) {
                return accountDifference < 0n ? -1 : 1;
            }

            return (
                a.direction.localeCompare(b.direction) ||
                (
                    BigInt(a.amountKobo) < BigInt(b.amountKobo)
                        ? -1
                        : BigInt(a.amountKobo) > BigInt(b.amountKobo)
                            ? 1
                            : 0
                )
            );
        })
    );
};

const postLedgerTransaction = async ({
    idempotencyKey,
    type,
    reference,
    metadata = {},
    entries,
    trx: existingTrx = null
}) => {
    if (
        typeof idempotencyKey !== 'string' ||
        !idempotencyKey.trim() ||
        idempotencyKey.length > 150
    ) {
        throw createError('A valid idempotency key is required');
    }

    if (
        typeof type !== 'string' ||
        !type.trim() ||
        type.length > 50
    ) {
        throw createError('A valid transaction type is required');
    }

    if (
        typeof reference !== 'string' ||
        !reference.trim() ||
        reference.length > 100
    ) {
        throw createError('A valid transaction reference is required');
    }

    if (
        !metadata ||
        typeof metadata !== 'object' ||
        Array.isArray(metadata)
    ) {
        throw createError('Metadata must be an object');
    }

    if (!Array.isArray(entries) || entries.length < 2) {
        throw createError('At least two ledger entries are required');
    }

    const normalizedEntries = entries.map((entry) => {
        if (!['debit', 'credit'].includes(entry.direction)) {
            throw createError('Entry direction must be debit or credit');
        }

        return {
            accountId: normalizeId(entry.accountId),
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

    if (totalDebits !== totalCredits) {
        throw createError('Ledger transaction is not balanced');
    }

    if (totalDebits === 0n) {
        throw createError('Transaction amount must be greater than zero');
    }

    const requestedFingerprint = createFingerprint(
        normalizedEntries.map((entry) => ({
            accountId: entry.accountId,
            direction: entry.direction,
            amountKobo: entry.amount.toString()
        }))
    );

    const execute = async (trx) => {
        const inserted = await trx('transactions')
            .insert({
                reference: reference.trim(),
                type: type.trim(),
                status: 'pending',
                idempotency_key: idempotencyKey.trim(),
                metadata
            })
            .onConflict('idempotency_key')
            .ignore()
            .returning('id');

        if (inserted.length === 0) {
            const existing = await trx('transactions')
                .where({ idempotency_key: idempotencyKey.trim() })
                .first();

            if (!existing) {
                throw createError(
                    'Unable to retrieve existing transaction',
                    500
                );
            }

            if (existing.status !== 'posted') {
                throw createError(
                    'Existing transaction is not posted',
                    409
                );
            }

            if (
                existing.type !== type.trim() ||
                existing.reference !== reference.trim()
            ) {
                throw createError(
                    'Idempotency key was already used for another transaction',
                    409
                );
            }

            const existingEntries = await trx('ledger_entries')
                .where({ transaction_id: existing.id });

            const existingFingerprint = createFingerprint(
                existingEntries.map((entry) => ({
                    accountId: entry.account_id,
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

        const transactionId = String(
            inserted[0].id ?? inserted[0]
        );

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

        const accountIds = [...balanceChanges.keys()].sort(
            (a, b) => {
                const difference = BigInt(a) - BigInt(b);
                return difference < 0n ? -1 : difference > 0n ? 1 : 0;
            }
        );

        const accounts = await trx('accounts')
            .whereIn('id', accountIds)
            .orderBy('id', 'asc')
            .forUpdate();

        if (accounts.length !== accountIds.length) {
            throw createError(
                'One or more financial accounts were not found',
                404
            );
        }

        const currencies = new Set(
            accounts.map((account) => account.currency)
        );

        if (currencies.size !== 1) {
            throw createError(
                'All ledger accounts must use the same currency'
            );
        }

        for (const account of accounts) {
            if (account.status !== 'active') {
                throw createError(
                    `Account ${account.id} is not active`,
                    409
                );
            }

            const accountId = String(account.id);
            const change = balanceChanges.get(accountId);
            const currentBalance = BigInt(account.balance_kobo);
            const newBalance = currentBalance + change;

            if (newBalance < 0n) {
                throw createError(
                    `Insufficient funds in account ${accountId}`,
                    409
                );
            }

            if (newBalance > MAX_BIGINT) {
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
        };

    return existingTrx
        ? execute(existingTrx)
        : db.transaction(execute);
};

const getAccountBalance = async (accountId) => {
    const normalizedId = normalizeId(accountId);

    const account = await db('accounts')
        .where({ id: normalizedId })
        .first();

    if (!account) {
        throw createError('Account not found', 404);
    }

    return {
        accountId: String(account.id),
        currency: account.currency,
        balanceKobo: account.balance_kobo,
        status: account.status
    };
};

module.exports = {
    postLedgerTransaction,
    getAccountBalance
};
