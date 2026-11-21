
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

    const reference = `PAY-${crypto.randomUUID()}`;

    const vendorAccount = await getUserAccount(String(vendorId));
    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const transaction = await postLedgerTransaction({
        idempotencyKey: `payout:${idempotencyKey}`,
        reference,
        type: 'PAYOUT_REQUEST',
        metadata: {
            ...metadata,
            vendorId: String(vendorId),
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

    const transactionId = String(transaction.transaction.id);

    const payout = await createPayoutRecord({
        userId: String(vendorId),
        transactionId,
        amountKobo,
        reference,
        idempotencyKey
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
