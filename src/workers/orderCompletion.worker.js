
const { Worker } = require('bullmq');

const redis = require('../config/redis');
const db = require('../config/postgres');

const {
    releaseEscrowToVendor
} = require('../services/escrowRelease.service');

const worker = new Worker(
    'orderCompletionQueue',
    async (job) => {
        const { subOrderId } = job.data;

        const subOrder = await db('sub_orders')
            .where({ id: subOrderId })
            .first();

        if (!subOrder) {
            throw new Error('Sub-order not found');
        }

      
        if (subOrder.status !== 'delivered') {
            return {
                skipped: true,
                reason: `Order status is ${subOrder.status}`
            };
        }

        if (new Date(subOrder.escrow_release_at) > new Date()) {
            throw new Error('Escrow release time has not arrived');
        }

        const release = await releaseEscrowToVendor({
            vendorId: subOrder.vendor_id,
            amountKobo: Number(subOrder.escrow_amount_kobo),
            platformFeeKobo: Number(subOrder.platform_fee_kobo),
            idempotencyKey: `order-release-${subOrder.id}`,
            reference: `ORDER-RELEASE-${subOrder.id}`,
            orderId: String(subOrder.order_id),
            metadata: {
                subOrderId: String(subOrder.id),
                reason: 'AUTOMATIC_ORDER_COMPLETION'
            }
        });

        await db.transaction(async (trx) => {
            await trx('sub_orders')
                .where({
                    id: subOrder.id,
                    status: 'delivered'
                })
                .update({
                    status: 'completed',
                    completed_at: trx.fn.now(),
                    updated_at: trx.fn.now()
                });

            const remaining = await trx('sub_orders')
                .where({ order_id: subOrder.order_id })
                .whereNot({ status: 'completed' })
                .count('* as count')
                .first();

            if (Number(remaining.count) === 0) {
                await trx('orders')
                    .where({ id: subOrder.order_id })
                    .update({
                        status: 'completed',
                        updated_at: trx.fn.now()
                    });
            }
        });

        return {
            success: true,
            message: 'Order automatically completed',
            transaction: release.transaction
        };
    },
    { connection: redis }
);

worker.on('completed', (job) => {
    console.log(`Order completion job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
    console.error(
        `Order completion job ${job?.id} failed:`,
        error.message
    );
});

worker.on('error', (error) => {
    console.error('Order completion worker error:', error);
});

module.exports = worker;
      
