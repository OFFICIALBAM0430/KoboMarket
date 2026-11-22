
const crypto = require('crypto');

const db = require('../config/postgres');

const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const VendorStore = require('../models/vendorStore.model');
const { orderCompletionQueue } = require('../queues/orderCompletion.queue');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const checkout = async ({
    buyerId,
    idempotencyKey,
    shippingAddress
}) => {
    if (!buyerId) {
        throw createError('Buyer authentication is required', 401);
    }

    if (!idempotencyKey || !shippingAddress) {
        throw createError('Checkout details are required');
    }

    const userId = String(buyerId);

    const existingOrder = await db('orders')
        .where({ idempotency_key: idempotencyKey })
        .first();

    if (existingOrder) {
        if (String(existingOrder.buyer_id) !== userId) {
            throw createError(
                'Idempotency key belongs to another buyer',
                409
            );
        }

        return {
            success: true,
            message: 'Checkout already completed',
            order: existingOrder
        };
    }

    const cart = await Cart.findOne({ user: buyerId })
        .populate('items.product');

    if (!cart || !cart.items || cart.items.length === 0) {
        throw createError('Your cart is empty');
    }

    const groupedItems = new Map();
    const stockChanges = [];

    let totalKobo = 0;

    for (const item of cart.items) {
        const product = item.product;
        const quantity = Number(item.quantity);

        if (
            !product ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            throw createError('Invalid cart item');
        }

        if (product.status !== 'active') {
            throw createError(
                `Product ${product.name} is unavailable`
            );
        }

        if (
            !Number.isSafeInteger(product.priceKobo) ||
            product.priceKobo <= 0
        ) {
            throw createError(
                `Invalid price for ${product.name}`
            );
        }

        if (product.stock < quantity) {
            throw createError(
                `Insufficient stock for ${product.name}`,
                409
            );
        }

        const storeId = String(product.store);
        const lineTotal = product.priceKobo * quantity;

        if (!Number.isSafeInteger(lineTotal)) {
            throw createError('Order amount exceeds supported limit');
        }

        totalKobo += lineTotal;

        if (!Number.isSafeInteger(totalKobo)) {
            throw createError('Order total exceeds supported limit');
        }

        if (!groupedItems.has(storeId)) {
            groupedItems.set(storeId, []);
        }

        groupedItems.get(storeId).push({
            product,
            quantity,
            lineTotal
        });
    }

    const storeIds = [...groupedItems.keys()];

    const stores = await VendorStore.find({
        _id: { $in: storeIds },
        status: 'active'
    });

    if (stores.length !== storeIds.length) {
        throw createError(
            'One or more vendor stores are unavailable',
            409
        );
    }

    const reference = `ORD-${crypto.randomUUID()}`;

    const ledgerIdempotencyKey = `checkout:${crypto
        .createHash('sha256')
        .update(idempotencyKey)
        .digest('hex')}`;

    let order;


    try {
        order = await db.transaction(async (trx) => {
            const accounts = await trx('accounts')
                .where(function () {
                    this.where({
                        owner_type: 'user',
                        owner_id: userId,
                        currency: 'NGN'
                    }).orWhere({
                        owner_type: 'system',
                        owner_id: 'PLATFORM_ESCROW',
                        currency: 'NGN'
                    });
                })
                .orderBy('id')
                .forUpdate();

            const buyerAccount = accounts.find(
                account =>
                    account.owner_type === 'user' &&
                    account.owner_id === userId
            );

            const escrowAccount = accounts.find(
                account =>
                    account.owner_type === 'system' &&
                    account.owner_id === 'PLATFORM_ESCROW'
            );

            if (!buyerAccount || !escrowAccount) {
                throw createError(
                    'Buyer wallet or escrow account not found',
                    404
                );
            }

            if (
                buyerAccount.status !== 'active' ||
                escrowAccount.status !== 'active'
            ) {
                throw createError(
                    'Wallet or escrow account is unavailable',
                    409
                );
            }

            
            const duplicate = await trx('orders')
                .where({ idempotency_key: idempotencyKey })
                .first();

            if (duplicate) {
                if (String(duplicate.buyer_id) !== userId) {
                    throw createError(
                        'Idempotency key belongs to another buyer',
                        409
                    );
                }

                return duplicate;
            }

            if (
                BigInt(buyerAccount.balance_kobo) <
                BigInt(totalKobo)
            ) {
                throw createError(
                    'Insufficient wallet balance',
                    400
                );
            }

            
            for (const items of groupedItems.values()) {
                for (const item of items) {
                    const result = await Product.updateOne(
                        {
                            _id: item.product._id,
                            status: 'active',
                            stock: { $gte: item.quantity }
                        },
                        {
                            $inc: { stock: -item.quantity }
                        }
                    );

                    if (result.modifiedCount !== 1) {
                        throw createError(
                            `Stock changed for ${item.product.name}. Please try again.`,
                            409
                        );
                    }

                    stockChanges.push({
                        productId: item.product._id,
                        quantity: item.quantity
                    });
                }
            }

            const [createdOrder] = await trx('orders')
                .insert({
                    buyer_id: userId,
                    reference,
                    idempotency_key: idempotencyKey,
                    total_kobo: String(totalKobo),
                    currency: 'NGN',
                    status: 'paid',
                    shipping_address: JSON.stringify(shippingAddress)
                })
                .returning('*');

            
            const [ledgerTransaction] = await trx('transactions')
                .insert({
                    reference: `CHECKOUT-${reference}`,
                    type: 'ORDER_ESCROW_FUNDING',
                    status: 'pending',
                    idempotency_key: ledgerIdempotencyKey,
                    metadata: JSON.stringify({
                        orderReference: reference,
                        buyerId: userId,
                        totalKobo
                    })
                })
                .returning('*');

            await trx('ledger_entries').insert([
                {
                    transaction_id: ledgerTransaction.id,
                    account_id: buyerAccount.id,
                    direction: 'debit',
                    amount_kobo: String(totalKobo)
                },
                {
                    transaction_id: ledgerTransaction.id,
                    account_id: escrowAccount.id,
                    direction: 'credit',
                    amount_kobo: String(totalKobo)
                }
            ]);

            await trx('accounts')
                .where({ id: buyerAccount.id })
                .update({
                    balance_kobo: trx.raw(
                        'balance_kobo - ?',
                        [String(totalKobo)]
                    ),
                    updated_at: trx.fn.now()
                });

            await trx('accounts')
                .where({ id: escrowAccount.id })
                .update({
                    balance_kobo: trx.raw(
                        'balance_kobo + ?',
                        [String(totalKobo)]
                    ),
                    updated_at: trx.fn.now()
                });

            await trx('transactions')
                .where({ id: ledgerTransaction.id })
                .update({ status: 'posted' });

            
            for (const [storeId, items] of groupedItems.entries()) {
                const subtotal = items.reduce(
                    (sum, item) => sum + item.lineTotal,
                    0
                );

                const store = stores.find(
                    entry => String(entry._id) === storeId
                );

                const [subOrder] = await trx('sub_orders')
                    .insert({
                        order_id: createdOrder.id,
                        vendor_id: String(store.owner),
                        store_id: storeId,
                        subtotal_kobo: String(subtotal),
                        platform_fee_kobo: '0',
                        vendor_amount_kobo: String(subtotal),
                        escrow_amount_kobo: String(subtotal),
                        status: 'paid'
                    })
                    .returning('*');

                await trx('order_items').insert(
                    items.map(item => ({
                        sub_order_id: subOrder.id,
                        product_id: String(item.product._id),
                        product_name: item.product.name,
                        unit_price_kobo: String(item.product.priceKobo),
                        quantity: item.quantity,
                        line_total_kobo: String(item.lineTotal)
                    }))
                );
            }

            return createdOrder;
        });
    } catch (error) {
        
        for (const change of stockChanges.reverse()) {
            await Product.updateOne(
                { _id: change.productId },
                { $inc: { stock: change.quantity } }
            ).catch(() => {});
        }

        throw error;
    }

    let cartCleared = true;

    try {
        await Cart.updateOne(
            { _id: cart._id },
            { $set: { items: [] } }
        );
    } catch (error) {
        cartCleared = false;
    }

    return {
        success: true,
        message: cartCleared
            ? 'Checkout completed successfully'
            : 'Checkout completed successfully, but cart cleanup is pending',
        cartCleared,
        order
    };
};


const getBuyerOrders = async (buyerId) => {
    if (!buyerId) {
        throw createError('Authentication required', 401);
    }

    const orders = await db('orders')
        .where({ buyer_id: String(buyerId) })
        .orderBy('created_at', 'desc');

    return orders;
};

const getVendorOrders = async (vendorId) => {
    if (!vendorId) {
        throw createError('Authentication required', 401);
    }

    const orders = await db('sub_orders')
        .where({ vendor_id: String(vendorId) })
        .orderBy('created_at', 'desc');

    for (const order of orders) {
        order.items = await db('order_items')
            .where({ sub_order_id: order.id });
    }

    return orders;
};


const updateVendorOrderStatus = async ({
    vendorId,
    subOrderId,
    status
}) => {
    if (!vendorId) {
        throw createError('Authentication required', 401);
    }

    const allowedTransitions = {
        paid: 'processing',
        processing: 'shipped',
        shipped: 'delivered'
    };

    if (!['processing', 'shipped', 'delivered'].includes(status)) {
        throw createError('Invalid order status');
    }

    const updatedOrder = await db.transaction(async (trx) => {
        const subOrder = await trx('sub_orders')
            .where({
                id: subOrderId,
                vendor_id: String(vendorId)
            })
            .forUpdate()
            .first();

        if (!subOrder) {
            throw createError('Vendor order not found', 404);
        }

        if (allowedTransitions[subOrder.status] !== status) {
            throw createError(
                `Cannot change order from ${subOrder.status} to ${status}`,
                409
            );
        }

        const now = new Date();

        const updateData = {
            status,
            updated_at: now
        };

        if (status === 'shipped') {
            updateData.shipped_at = now;
        }

        if (status === 'delivered') {
            updateData.delivered_at = now;
            updateData.escrow_release_at = new Date(
                now.getTime() + 72 * 60 * 60 * 1000
            );
        }

        await trx('sub_orders')
            .where({ id: subOrderId })
            .update(updateData);

        const subOrders = await trx('sub_orders')
            .where({ order_id: subOrder.order_id });

        const allDelivered = subOrders.every(
            item =>
                String(item.id) === String(subOrder.id)
                    ? status === 'delivered'
                    : item.status === 'delivered'
        );

        const anyShipped = subOrders.some(
            item =>
                String(item.id) === String(subOrder.id)
                    ? ['shipped', 'delivered'].includes(status)
                    : ['shipped', 'delivered'].includes(item.status)
        );

        const anyProcessing = subOrders.some(
            item =>
                String(item.id) === String(subOrder.id)
                    ? ['processing', 'shipped', 'delivered'].includes(status)
                    : ['processing', 'shipped', 'delivered'].includes(item.status)
        );

        let parentStatus = 'paid';

        if (allDelivered) {
            parentStatus = 'delivered';
        } else if (anyShipped) {
            parentStatus = 'shipped';
        } else if (anyProcessing) {
            parentStatus = 'processing';
        }

        await trx('orders')
            .where({ id: subOrder.order_id })
            .update({
                status: parentStatus,
                updated_at: now
            });

        return trx('sub_orders')
            .where({ id: subOrderId })
            .first();
    });

    if (status === 'delivered') {
        await orderCompletionQueue.add(
            'complete-delivered-order',
            { subOrderId: String(subOrderId) },
            {
                jobId: `complete-suborder-${subOrderId}`,
                delay: 72 * 60 * 60 * 1000
            }
        );
    }

    return updatedOrder;
};
        
                
module.exports = {
    checkout,
    getBuyerOrders,
    getVendorOrders,
    updateVendorOrderStatus
};
