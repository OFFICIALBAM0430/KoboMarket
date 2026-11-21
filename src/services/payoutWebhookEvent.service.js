
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
    if (!eventKey || !eventType || !payoutReference || !payload) {
        throw createError('Webhook event details are required');
    }

    const [inserted] = await db('payout_webhook_events')
        .insert({
            event_key: eventKey,
            event_type: eventType,
            payout_reference: payoutReference,
            payload,
            status: 'processing'
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

    const existing = await db('payout_webhook_events')
        .where({ event_key: eventKey })
        .first();

    if (!existing) {
        throw createError('Could not retrieve webhook event', 500);
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

    const [retried] = await db('payout_webhook_events')
        .where({
            id: existing.id,
            status: 'failed'
        })
        .update({
            status: 'processing',
            attempts: db.raw('attempts + 1'),
            last_error: null,
            updated_at: db.fn.now()
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
};

const markWebhookProcessed = async (eventKey) => {
    const updated = await db('payout_webhook_events')
        .where({ event_key: eventKey })
        .update({
            status: 'processed',
            processed_at: db.fn.now(),
            updated_at: db.fn.now()
        });

    if (!updated) {
        throw createError('Webhook event record not found', 404);
    }
};

const markWebhookFailed = async (eventKey, errorMessage) => {
    await db('payout_webhook_events')
        .where({ event_key: eventKey })
        .update({
            status: 'failed',
            last_error: String(errorMessage).slice(0, 5000),
            updated_at: db.fn.now()
        });
};

module.exports = {
    registerWebhookEvent,
    markWebhookProcessed,
    markWebhookFailed
};
  
