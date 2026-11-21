
const db = require('../config/postgres');

const ALLOWED_TRANSITIONS = {
    pending: ['processing', 'failed'],
    processing: ['paid', 'failed'],
    paid: [],
    failed: ['reversed'],
    reversed: []
};

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const findExistingPayout = async (idempotencyKey) => {
    return db('payout_requests')
        .where({ idempotency_key: idempotencyKey })
        .first();
};

const createPayoutRecord = async ({
    userId,
    transactionId,
    amountKobo,
    reference,
    idempotencyKey
}) => {
    if (!userId || !transactionId || !reference || !idempotencyKey) {
        throw createError('All payout details are required');
    }

    if (!/^[1-9]\d*$/.test(String(amountKobo))) {
        throw createError('Invalid payout amount');
    }

    const existing = await findExistingPayout(idempotencyKey);

    if (existing) {
        if (
            existing.user_id !== String(userId) ||
            String(existing.transaction_id) !== String(transactionId) ||
            String(existing.amount_kobo) !== String(amountKobo)
        ) {
            throw createError(
                'Idempotency key was reused with different payout details',
                409
            );
        }

        return existing;
    }

    try {
        const [payout] = await db('payout_requests')
            .insert({
                user_id: String(userId),
                transaction_id: String(transactionId),
                amount_kobo: String(amountKobo),
                reference,
                idempotency_key: idempotencyKey
            })
            .returning('*');

        return payout;
    } catch (error) {
        if (error.code !== '23505') {
            throw error;
        }

        const duplicate = await findExistingPayout(idempotencyKey);

        if (!duplicate) {
            throw error;
        }

        if (
            duplicate.user_id !== String(userId) ||
            String(duplicate.transaction_id) !== String(transactionId) ||
            String(duplicate.amount_kobo) !== String(amountKobo)
        ) {
            throw createError(
                'Idempotency key was reused with different payout details',
                409
            );
        }

        return duplicate;
    }
};

const getPayoutByReference = async (reference) => {
    const payout = await db('payout_requests')
        .where({ reference })
        .first();

    if (!payout) {
        throw createError('Payout request not found', 404);
    }

    return payout;
};


const saveRecipientCode = async (payoutId, recipientCode) => {
    if (!payoutId || !recipientCode) {
        throw createError('Payout ID and recipient code are required');
    }

    const [updated] = await db('payout_requests')
        .where({ id: payoutId })
        .update({
            recipient_code: recipientCode,
            updated_at: db.fn.now()
        })
        .returning('*');

    if (!updated) {
        throw createError('Payout request not found', 404);
    }

    return updated;
};

const updatePayoutStatus = async ({
    payoutId,
    status,
    failureReason = null,
    providerReference = null,
    reversalTransactionId = null
}) => {
    return db.transaction(async (trx) => {
        const payout = await trx('payout_requests')
            .where({ id: payoutId })
            .forUpdate()
            .first();

        if (!payout) {
            throw createError('Payout request not found', 404);
        }

        const allowed = ALLOWED_TRANSITIONS[payout.status] || [];

        if (!allowed.includes(status)) {
            throw createError(
                `Cannot change payout from ${payout.status} to ${status}`,
                409
            );
        }

        const updates = {
            status,
            updated_at: trx.fn.now()
        };

        if (status === 'failed') {
            updates.failure_reason = failureReason;
        }

        if (providerReference) {
            updates.provider_reference = providerReference;
        }

        if (status === 'reversed') {
            if (!reversalTransactionId) {
                throw createError(
                    'Reversal transaction ID is required'
                );
            }

            updates.reversal_transaction_id =
                String(reversalTransactionId);
        }

        const [updated] = await trx('payout_requests')
            .where({ id: payoutId })
            .update(updates)
            .returning('*');

        return updated;
    });
};

module.exports = {
    createPayoutRecord,
    getPayoutByReference,
    updatePayoutStatus,
    saveRecipientCode
};
