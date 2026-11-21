
const {
    getPayoutByReference,
    updatePayoutStatus
} = require('./payoutRecord.service');

const {
    reverseFailedPayout
} = require('./payoutReversal.service');

const handlePaystackPayoutWebhook = async (event) => {
    const { event: eventType, data } = event || {};

    if (
        !data ||
        !data.reference ||
        !['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(eventType)
    ) {
        throw new Error('Invalid or unsupported payout webhook');
    }

    const payout = await getPayoutByReference(data.reference);

    if (String(data.amount) !== String(payout.amount_kobo)) {
        throw new Error('Webhook amount does not match payout amount');
    }

    if (data.currency !== 'NGN') {
        throw new Error('Unexpected payout currency');
    }

    if (eventType === 'transfer.success') {
        if (payout.status === 'paid') {
            return { success: true, message: 'Payout already completed' };
        }

        if (['failed', 'reversed'].includes(payout.status)) {
            throw new Error('Conflicting payout status received');
        }

        const updated = await updatePayoutStatus({
            payoutId: payout.id,
            status: 'paid',
            providerReference: data.transfer_code
        });

        return {
            success: true,
            message: 'Payout marked as paid',
            payout: updated
        };
    }

    if (payout.status === 'reversed') {
        return { success: true, message: 'Payout already reversed' };
    }

    if (payout.status === 'paid') {
        throw new Error('Cannot reverse an already paid payout');
    }

    if (payout.status !== 'failed') {
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
        message: 'Failed payout reversed',
        payout: updated
    };
};

module.exports = { handlePaystackPayoutWebhook };
