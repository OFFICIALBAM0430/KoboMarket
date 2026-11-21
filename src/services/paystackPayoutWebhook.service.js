
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

const {
    settleSuccessfulPayout,
    restoreReversedPayoutToClearing
} = require('./payoutSettlement.service');


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

        // SUCCESSFUL TRANSFER
        if (eventType === 'transfer.success') {
            if (payout.status === 'paid') {
                await markWebhookProcessed(eventKey);

                return {
                    success: true,
                    message: 'Payout already completed'
                };
            }

            if (
                payout.status === 'failed' ||
                payout.status === 'reversed'
            ) {
                throw new Error('Conflicting payout status');
            }

            await settleSuccessfulPayout({
                amountKobo: Number(payout.amount_kobo),
                reference: payout.reference,
                idempotencyKey: payout.reference
            });

            await updatePayoutStatus({
                payoutId: payout.id,
                status: 'paid',
                providerReference: data.transfer_code
            });
        }

        // FAILED OR REVERSED TRANSFER
        else {
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
                    'A paid payout cannot be marked as failed'
                );
            }

            // Mark pending or processing payouts as failed.
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

            // Restore a previously settled transfer to clearing.
            if (eventType === 'transfer.reversed') {
                await restoreReversedPayoutToClearing({
                    amountKobo: Number(payout.amount_kobo),
                    reference: payout.reference,
                    idempotencyKey: payout.reference
                });
            }

            // Refund the vendor's wallet from clearing.
            const reversal = await reverseFailedPayout({
                vendorId: payout.user_id,
                amountKobo: Number(payout.amount_kobo),
                idempotencyKey: `payout-reversal:${payout.reference}`,
                reference: `REV-${payout.reference}`,
                originalPayoutReference: payout.reference,
                reason: eventType === 'transfer.reversed'
                    ? 'PAYOUT_REVERSED'
                    : 'PAYOUT_FAILED'
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

module.exports = {
    handlePaystackPayoutWebhook
};
                
