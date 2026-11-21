
const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');

const MINIMUM_PAYOUT_KOBO = 100000; // ₦1,000

const requestPayout = async ({
    vendorId,
    amountKobo,
    idempotencyKey,
    reference,
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

    const vendorAccount = await getUserAccount(vendorId);

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const transaction = await postLedgerTransaction({
        idempotencyKey,
        reference,
        type: 'PAYOUT_REQUEST',
        metadata: {
            ...metadata,
            vendorId,
            amountKobo,
            payoutStatus: 'pending'
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

    return {
        success: true,
        message: 'Withdrawal request created successfully',
        transaction
    };
};

module.exports = {
    requestPayout,
    MINIMUM_PAYOUT_KOBO
};
