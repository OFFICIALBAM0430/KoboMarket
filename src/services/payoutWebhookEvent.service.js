
const db = require('../config/postgres');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const registerWebhookEvent = async ({
    eventKey,
    eventType,
    payoutReference,
    payload
}) => {
    if (
        typeof eventKey !== 'string' ||
        !eventKey.trim() ||
        typeof eventType !== 'string' ||
        !eventType.trim() ||
        typeof payoutReference !== 'string' ||
        !payoutReference.trim() ||
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
    ) {
        throw createError('Invalid webhook event details');
    }

    if (eventKey.length > 150) {
        throw createError('Webhook event key is too long');
    }

    return db.transaction(async (trx) => {
        const [inserted] = await trx('payout_webhook_events')
            .insert({
                event_key: eventKey,
                event_type: eventType,
                payout_reference: payoutReference,
                payload,
                status: 'processing',
                attempts: 1
            })
            .onConflict('event_key')
            .ignore()
            .returning('*');

        if (inserted) {
            return {
                isNew: true,
                event: inserted
            };
        }

        const existing = await trx('payout_webhook_events')
            .where({ event_key: eventKey })
            .forUpdate()
            .first();

        if (!existing) {
            throw createError(
                'Could not retrieve webhook event',
                500
            );
        }

        if (
            existing.event_type !== eventType ||
            existing.payout_reference !== payoutReference
        ) {
            throw createError(
                'Webhook event key conflicts with existing event data',
                409
            );
        }

        if (existing.status === 'processed') {
            return {
                isNew: false,
                alreadyProcessed: true,
                event: existing
            };
        }

        if (existing.status === 'processing') {
            return {
                isNew: false,
                currentlyProcessing: true,
                event: existing
            };
        }

        if (existing.status === 'failed') {
            const [retried] = await trx('payout_webhook_events')
                .where({
                    id: existing.id,
                    status: 'failed'
                })
                .update({
                    status: 'processing',
                    attempts: trx.raw('attempts + 1'),
                    last_error: null,
                    updated_at: trx.fn.now()
                })
                .returning('*');

            if (!retried) {
                return {
                    isNew: false,
                    currentlyProcessing: true,
                    event: existing
                };
            }

            return {
                isNew: true,
                event: retried
            };
        }

        throw createError(
            'Unknown webhook event status',
            500
        );
    });
};

const markWebhookProcessed = async (eventKey) => {
    const updated = await db('payout_webhook_events')
        .where({
            event_key: eventKey,
            status: 'processing'
        })
        .update({
            status: 'processed',
            processed_at: db.fn.now(),
            last_error: null,
            updated_at: db.fn.now()
        });

    if (!updated) {
        throw createError(
            'Webhook event could not be marked as processed',
            409
        );
    }
};

const markWebhookFailed = async (eventKey, errorMessage) => {
    const updated = await db('payout_webhook_events')
        .where({
            event_key: eventKey,
            status: 'processing'
        })
        .update({
            status: 'failed',
            last_error: String(errorMessage).slice(0, 5000),
            updated_at: db.fn.now()
        });

    if (!updated) {
        throw createError(
            'Webhook event could not be marked as failed',
            409
        );
    }
};

module.exports = {
    registerWebhookEvent,
    markWebhookProcessed,
    markWebhookFailed
};
