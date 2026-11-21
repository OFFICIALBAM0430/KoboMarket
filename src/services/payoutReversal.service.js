
const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');
const { getPayoutByReference } = require('./payoutRecord.service');

const reverseFailedPayout = async ({
    vendorId,
    amountKobo,
    idempotencyKey,
    reference,
    originalPayoutReference,
    reason = 'PAYOUT_FAILED',
    metadata = {}
}) => {
    if (!vendorId) {
        throw new Error('Vendor ID is required');
    }

    const normalizedVendorId = String(vendorId);

    if (
        typeof amountKobo !== 'number' ||
        !Number.isSafeInteger(amountKobo) ||
        amountKobo <= 0
    ) {
        throw new Error('Invalid payout reversal amount');
    }

    if (
        typeof idempotencyKey !== 'string' ||
        idempotencyKey.trim().length < 10 ||
        idempotencyKey.trim().length > 150
    ) {
        throw new Error('Invalid reversal idempotency key');
    }

    if (
        typeof reference !== 'string' ||
        !reference.trim() ||
        reference.length > 100
    ) {
        throw new Error('Invalid reversal reference');
    }

    if (
        typeof originalPayoutReference !== 'string' ||
        !originalPayoutReference.trim()
    ) {
        throw new Error('Original payout reference is required');
    }

    if (!['PAYOUT_FAILED', 'PAYOUT_REVERSED'].includes(reason)) {
        throw new Error('Invalid payout reversal reason');
    }

    if (
        !metadata ||
        typeof metadata !== 'object' ||
        Array.isArray(metadata)
    ) {
        throw new Error('Invalid reversal metadata');
    }

    // Verify that the original payout exists and belongs to this vendor.
    const payout = await getPayoutByReference(
        originalPayoutReference
    );

    if (String(payout.user_id) !== normalizedVendorId) {
        throw new Error('Payout does not belong to this vendor');
    }

    if (String(payout.amount_kobo) !== String(amountKobo)) {
        throw new Error('Reversal amount does not match original payout');
    }

    if (!['failed', 'paid'].includes(payout.status)) {
        throw new Error(
            'Payout must be failed or paid before it can be reversed'
        );
    }

    const vendorAccount = await getUserAccount(
        normalizedVendorId
    );

    const clearingAccount = await getSystemAccount(
        'PLATFORM_PAYOUT_CLEARING'
    );

    const transaction = await postLedgerTransaction({
        idempotencyKey: idempotencyKey.trim(),
        reference: reference.trim(),
        type: 'PAYOUT_REVERSAL',
        metadata: {
            ...metadata,
            vendorId: normalizedVendorId,
            originalPayoutReference,
            amountKobo,
            reason
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
        message: 'Payout reversal recorded successfully',
        transaction
    };
};

module.exports = {
    reverseFailedPayout
};
