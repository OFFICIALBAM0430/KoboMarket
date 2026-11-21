
const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');

const reverseFailedPayout = async ({
    vendorId,
    amountKobo,
    idempotencyKey,
    reference,
    originalPayoutReference,
    metadata = {}
}) => {
    if (!vendorId) {
        throw new Error('Vendor ID is required');
    }

    if (
        typeof amountKobo !== 'number' ||
        !Number.isSafeInteger(amountKobo) ||
        amountKobo <= 0
    ) {
        throw new Error('Invalid payout reversal amount');
    }

    if (!originalPayoutReference) {
        throw new Error('Original payout reference is required');
    }

    const vendorAccount = await getUserAccount(vendorId);

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const transaction = await postLedgerTransaction({
        idempotencyKey,
        reference,
        type: 'PAYOUT_REVERSAL',
        metadata: {
            ...metadata,
            vendorId,
            originalPayoutReference,
            amountKobo,
            reason: 'PAYOUT_FAILED'
        },
        entries: [
            {
                accountId: clearingAccount.id,
                direction: 'debit',
                amountKobo
            },
            {
                accountId: vendorAccount.id,
                direction: 'credit',
                amountKobo
            }
        ]
    });

    return {
        success: true,
        message: 'Failed payout reversed successfully',
        transaction
    };
};

module.exports = {
    reverseFailedPayout
};
