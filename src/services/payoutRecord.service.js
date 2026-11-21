
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
    updatePayoutStatus
};
