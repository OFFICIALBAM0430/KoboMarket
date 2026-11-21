
const {
    getPayoutByReference,
    updatePayoutStatus
} = require('./payoutRecord.service');

const {
    reverseFailedPayout
} = require('./payoutReversal.service');

const handlePaystackPayoutWebhook = async (event) => {
    const { event: eventType, data } = event || {};

    const supportedEvents = [
        'transfer.success',
        'transfer.failed',
        'transfer.reversed'
    ];

    if (
        !data ||
        !data.reference ||
        !supportedEvents.includes(eventType)
    ) {
        throw new Error('Invalid or unsupported payout webhook');
    }

    const payout = await getPayoutByReference(data.reference);

    if (
        String(data.amount) !== String(payout.amount_kobo) ||
        data.currency !== 'NGN'
    ) {
        throw new Error('Webhook details do not match payout');
    }

    if (eventType === 'transfer.success') {
        if (payout.status === 'paid') {
            return { success: true, message: 'Already completed' };
        }

        if (['failed', 'reversed'].includes(payout.status)) {
            throw new Error('Conflicting payout status');
        }

        const updated = await updatePayoutStatus({
            payoutId: payout.id,
            status: 'paid',
            providerReference: data.transfer_code
        });

        return { success: true, payout: updated };
    }

    if (payout.status === 'reversed') {
        return { success: true, message: 'Already reversed' };
    }

    if (eventType === 'transfer.reversed' && payout.status !== 'paid') {
        throw new Error('Reversed transfer does not match payout status');
    }

    if (eventType === 'transfer.failed' && payout.status === 'paid') {
        throw new Error('A paid transfer cannot be marked failed');
    }

    if (payout.status !== 'failed' && payout.status !== 'paid') {
        await updatePayoutStatus({
            payoutId: payout.id,
            status: 'failed',
            failureReason: data.reason || eventType
        });
    }

    const reversal = await reverseFailedPayout({
        vendorId: payout.user_id,
        amountKobo: Number(payout.amount_kobo),
        idempotencyKey: `payout-reversal:${payout.reference}`,
        reference: `REV-${payout.reference}`,
        originalPayoutReference: payout.reference
    });

    const reversalTransactionId = String(
        reversal.transaction.transaction.id
    );

    const updated = await updatePayoutStatus({
        payoutId: payout.id,
        status: 'reversed',
        reversalTransactionId
    });

    return {
        success: true,
        message: 'Payout funds restored to vendor',
        payout: updated
    };
};

module.exports = { handlePaystackPayoutWebhook };
