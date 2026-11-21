
const {
    getSystemAccount
} = require('./systemAccount.service');

const {
    postLedgerTransaction
} = require('./ledger.service');

const settleSuccessfulPayout = async ({
    amountKobo,
    reference,
    idempotencyKey
}) => {
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
        throw new Error('Invalid payout settlement amount');
    }

    if (!reference || !idempotencyKey) {
        throw new Error('Settlement reference and idempotency key are required');
    }

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const settledAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_SETTLED'
    );

    return postLedgerTransaction({
        reference: `SETTLE-${reference}`,
        idempotencyKey: `payout-settlement:${idempotencyKey}`,
        type: 'PAYOUT_SETTLEMENT',
        metadata: {
            payoutReference: reference,
            amountKobo
        },
        entries: [
            {
                accountId: clearingAccount.id,
                direction: 'debit',
                amountKobo
            },
            {
                accountId: settledAccount.id,
                direction: 'credit',
                amountKobo
            }
        ]
    });
};

const restoreReversedPayoutToClearing = async ({
    amountKobo,
    reference,
    idempotencyKey
}) => {
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
        throw new Error('Invalid reversed payout amount');
    }

    if (!reference || !idempotencyKey) {
        throw new Error('Reversal reference and idempotency key are required');
    }

    const settledAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_SETTLED'
    );

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    return postLedgerTransaction({
        reference: `RESTORE-${reference}`,
        idempotencyKey: `payout-restore:${idempotencyKey}`,
        type: 'PAYOUT_RESTORE',
        metadata: {
            payoutReference: reference,
            amountKobo
        },
        entries: [
            {
                accountId: settledAccount.id,
                direction: 'debit',
                amountKobo
            },
            {
                accountId: clearingAccount.id,
                direction: 'credit',
                amountKobo
            }
        ]
    });
};

module.exports = {
    settleSuccessfulPayout,
    restoreReversedPayoutToClearing
};
