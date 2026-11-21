
const crypto = require('crypto');

const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');
const {
    createPayoutRecord
} = require('./payoutRecord.service');

const MINIMUM_PAYOUT_KOBO = 100000;

const requestPayout = async ({
    vendorId,
    amountKobo,
    idempotencyKey,
    metadata = {}
}) => {
    if (!vendorId) {
        throw new Error('Vendor ID is required');
    }

    if (
        typeof amountKobo !== 'number' ||
        !Number.isSafeInteger(amountKobo) ||
        amountKobo < MINIMUM_PAYOUT_KOBO
    ) {
        throw new Error('Minimum withdrawal amount is ₦1,000');
    }

    if (
        typeof idempotencyKey !== 'string' ||
        idempotencyKey.trim().length < 10 ||
        idempotencyKey.trim().length > 143
    ) {
        throw new Error('Invalid idempotency key');
    }

    const normalizedKey = idempotencyKey.trim();
    const normalizedVendorId = String(vendorId);

    // Generate the same reference for every retry.
    const reference = `PAY-${crypto
        .createHash('sha256')
        .update(`${normalizedVendorId}:${normalizedKey}`)
        .digest('hex')
        .slice(0, 32)}`;

    const vendorAccount = await getUserAccount(normalizedVendorId);

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const transaction = await postLedgerTransaction({
        idempotencyKey: `payout:${normalizedKey}`,
        reference,
        type: 'PAYOUT_REQUEST',
        metadata: {
            ...metadata,
            vendorId: normalizedVendorId,
            amountKobo
        },
        entries: [
            {
                accountId: vendorAccount.id,
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

    if (!transaction.transaction) {
        throw new Error('Payout ledger transaction was not returned');
    }

    const payout = await createPayoutRecord({
        userId: normalizedVendorId,
        transactionId: String(transaction.transaction.id),
        amountKobo,
        reference,
        idempotencyKey: normalizedKey
    });

    return {
        success: true,
        message: 'Withdrawal request created successfully',
        payout,
        transaction
    };
};

module.exports = {
    requestPayout,
    MINIMUM_PAYOUT_KOBO
};
