
const {
    getPayoutByReference,
    updatePayoutStatus
} = require('./payoutRecord.service');

const {
    reverseFailedPayout
} = require('./payoutReversal.service');

const {
    registerWebhookEvent,
    markWebhookProcessed,
    markWebhookFailed
} = require('./payoutWebhookEvent.service');

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

    const eventKey = `${eventType}:${data.reference}`;

    const registration = await registerWebhookEvent({
        eventKey,
        eventType,
        payoutReference: data.reference,
        payload: event
    });

    if (registration.alreadyProcessed) {
        return {
            success: true,
            message: 'Webhook event already processed'
        };
    }

    if (registration.currentlyProcessing) {
        return {
            success: true,
            message: 'Webhook event is already being processed'
        };
    }

    try {
        const payout = await getPayoutByReference(data.reference);

        if (
            String(data.amount) !== String(payout.amount_kobo) ||
            data.currency !== 'NGN'
        ) {
            throw new Error('Webhook details do not match payout');
        }

        if (eventType === 'transfer.success') {
            if (payout.status === 'paid') {
                await markWebhookProcessed(eventKey);

                return {
                    success: true,
                    message: 'Payout already completed'
                };
            }

            if (['failed', 'reversed'].includes(payout.status)) {
                throw new Error('Conflicting payout status');
            }

            await updatePayoutStatus({
                payoutId: payout.id,
                status: 'paid',
                providerReference: data.transfer_code
            });
        } else {
            if (payout.status === 'reversed') {
                await markWebhookProcessed(eventKey);

                return {
                    success: true,
                    message: 'Payout already reversed'
                };
            }

            if (
                eventType === 'transfer.reversed' &&
                payout.status !== 'paid'
            ) {
                throw new Error(
                    'Reversed transfer does not match payout status'
                );
            }

            if (
                eventType === 'transfer.failed' &&
                payout.status === 'paid'
            ) {
                throw new Error(
                    'A paid transfer cannot be marked failed'
                );
            }

            if (
                payout.status !== 'failed' &&
                payout.status !== 'paid'
            ) {
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

            await updatePayoutStatus({
                payoutId: payout.id,
                status: 'reversed',
                reversalTransactionId
            });
        }

        await markWebhookProcessed(eventKey);

        return {
            success: true,
            message: 'Payout webhook processed successfully'
        };
    } catch (error) {
        await markWebhookFailed(eventKey, error.message);
        throw error;
    }
};

module.exports = { handlePaystackPayoutWebhook };
