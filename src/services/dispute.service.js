
const db = require('../config/postgres');

const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const openDispute = async ({
    buyerId,
    subOrderId,
    reason,
    description
}) => {
    if (!buyerId) {
        throw createError('Authentication required', 401);
    }

    return db.transaction(async (trx) => {
        const subOrder = await trx('sub_orders')
            .where({ id: subOrderId })
            .forUpdate()
            .first();

        if (!subOrder) {
            throw createError('Order not found', 404);
        }

        const order = await trx('orders')
            .where({ id: subOrder.order_id })
            .first();

        if (!order || String(order.buyer_id) !== String(buyerId)) {
            throw createError('You cannot dispute this order', 403);
        }

        if (
            !['paid', 'processing', 'shipped', 'delivered'].includes(
                subOrder.status
            )
        ) {
            throw createError(
                'This order can no longer be disputed',
                409
            );
        }

        const existing = await trx('disputes')
            .where({ sub_order_id: subOrderId })
            .first();

        if (existing) {
            throw createError('A dispute already exists for this order', 409);
        }

        const [dispute] = await trx('disputes')
            .insert({
                sub_order_id: subOrder.id,
                buyer_id: String(buyerId),
                vendor_id: String(subOrder.vendor_id),
                reason,
                description,
                status: 'open'
            })
            .returning('*');

        await trx('sub_orders')
            .where({ id: subOrder.id })
            .update({
                status: 'disputed',
                updated_at: trx.fn.now()
            });

        await trx('orders')
            .where({ id: order.id })
            .update({
                status: 'disputed',
                updated_at: trx.fn.now()
            });

        return dispute;
    });
};

const resolveDispute = async ({
    disputeId,
    adminId,
    resolution,
    refundAmountKobo,
    adminNote = ''
}) => {
    if (!adminId) {
        throw createError('Administrator authentication required', 401);
    }

    const allowedResolutions = [
        'full_refund',
        'partial_refund',
        'rejected'
    ];

    if (!allowedResolutions.includes(resolution)) {
        throw createError('Invalid dispute resolution');
    }

    return db.transaction(async (trx) => {
        const dispute = await trx('disputes')
            .where({ id: disputeId })
            .forUpdate()
            .first();

        if (!dispute) {
            throw createError('Dispute not found', 404);
        }

        if (dispute.status !== 'open') {
            throw createError('Dispute has already been resolved', 409);
        }

        const subOrder = await trx('sub_orders')
            .where({ id: dispute.sub_order_id })
            .forUpdate()
            .first();

        if (!subOrder || subOrder.status !== 'disputed') {
            throw createError('Order is not in disputed status', 409);
        }

        const escrowAmount = BigInt(subOrder.escrow_amount_kobo);
        const vendorAmount = BigInt(subOrder.vendor_amount_kobo);
        const platformFee = BigInt(subOrder.platform_fee_kobo);

        if (escrowAmount <= 0n || vendorAmount + platformFee !== escrowAmount) {
            throw createError('Invalid escrow accounting for this order', 409);
        }

        let refundAmount = 0n;

        if (resolution === 'full_refund') {
            refundAmount = escrowAmount;
        } else if (resolution === 'partial_refund') {
            if (
                !Number.isSafeInteger(refundAmountKobo) ||
                refundAmountKobo <= 0
            ) {
                throw createError('A valid partial refund amount is required');
            }

            refundAmount = BigInt(refundAmountKobo);

            if (refundAmount >= escrowAmount) {
                throw createError(
                    'Partial refund must be less than the escrow amount'
                );
            }
        }

        const remainingAmount = escrowAmount - refundAmount;

        const escrowAccount = await getSystemAccount('PLATFORM_ESCROW');
        const buyerAccount = await getUserAccount(dispute.buyer_id);

        const entries = [
            {
                accountId: escrowAccount.id,
                direction: 'debit',
                amountKobo: escrowAmount.toString()
            }
        ];

        if (refundAmount > 0n) {
            entries.push({
                accountId: buyerAccount.id,
                direction: 'credit',
                amountKobo: refundAmount.toString()
            });
        }

        if (remainingAmount > 0n) {
            const vendorAccount = await getUserAccount(dispute.vendor_id);

            const vendorCredit = remainingAmount > vendorAmount
                ? vendorAmount
                : remainingAmount;

            const feeCredit = remainingAmount - vendorCredit;

            if (vendorCredit > 0n) {
                entries.push({
                    accountId: vendorAccount.id,
                    direction: 'credit',
                    amountKobo: vendorCredit.toString()
                });
            }

            if (feeCredit > 0n) {
                const revenueAccount = await getSystemAccount(
                    'PLATFORM_REVENUE'
                );

                entries.push({
                    accountId: revenueAccount.id,
                    direction: 'credit',
                    amountKobo: feeCredit.toString()
                });
            }
        }

        const ledgerResult = await postLedgerTransaction({
            trx,
            idempotencyKey: `dispute-resolution-${dispute.id}`,
            reference: `DISPUTE-${dispute.id}`,
            type: 'DISPUTE_RESOLUTION',
            metadata: {
                disputeId: String(dispute.id),
                subOrderId: String(subOrder.id),
                resolution,
                refundAmountKobo: refundAmount.toString(),
                adminId: String(adminId)
            },
            entries
        });

        const finalStatus = resolution === 'rejected'
            ? 'completed'
            : 'refunded';

        await trx('disputes')
            .where({ id: dispute.id })
            .update({
                status: 'resolved',
                resolution,
                refund_amount_kobo: refundAmount.toString(),
                admin_id: String(adminId),
                admin_note: adminNote,
                ledger_reference: `DISPUTE-${dispute.id}`,
                resolved_at: trx.fn.now(),
                updated_at: trx.fn.now()
            });

        await trx('sub_orders')
            .where({ id: subOrder.id })
            .update({
                status: finalStatus,
                completed_at: finalStatus === 'completed'
                    ? trx.fn.now()
                    : null,
                updated_at: trx.fn.now()
            });

        const otherSubOrders = await trx('sub_orders')
            .where({ order_id: subOrder.order_id })
            .whereNot({ id: subOrder.id });

        const allSettled = otherSubOrders.every(
            item => ['completed', 'refunded'].includes(item.status)
        );

        if (allSettled) {
            const hasRefund = resolution !== 'rejected' ||
                otherSubOrders.some(item => item.status === 'refunded');

            await trx('orders')
                .where({ id: subOrder.order_id })
                .update({
                    status: hasRefund ? 'refunded' : 'completed',
                    updated_at: trx.fn.now()
                });
        }

        return {
            success: true,
            message: 'Dispute resolved successfully',
            resolution,
            refundAmountKobo: refundAmount.toString(),
            ledgerTransaction: ledgerResult
        };
    });
};

module.exports = {
    openDispute,
    resolveDispute
};
              
