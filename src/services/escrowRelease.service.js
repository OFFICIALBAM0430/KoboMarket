
const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');

const MAX_BIGINT = 9223372036854775807n;

const toAmount = (value, fieldName) => {
    if (
        typeof value === 'number' &&
        !Number.isSafeInteger(value)
    ) {
        throw new Error(`${fieldName} must be a safe integer`);
    }

    if (
        (typeof value !== 'number' && typeof value !== 'string') ||
        !/^\d+$/.test(String(value))
    ) {
        throw new Error(`${fieldName} must be a positive integer`);
    }

    const amount = BigInt(value);

    if (amount < 0n || amount > MAX_BIGINT) {
        throw new Error(`${fieldName} is outside the supported range`);
    }

    return amount;
};

const releaseEscrowToVendor = async ({
    vendorId,
    amountKobo,
    platformFeeKobo,
    idempotencyKey,
    reference,
    orderId,
    metadata = {},
    trx = null
}) => {
    if (!vendorId) {
        throw new Error('Vendor ID is required');
    }

    if (!orderId) {
        throw new Error('Order ID is required');
    }

    const vendorAmount = toAmount(amountKobo, 'Vendor amount');
    const platformFee = toAmount(platformFeeKobo, 'Platform fee');

    if (vendorAmount <= 0n) {
        throw new Error('Vendor amount must be greater than zero');
    }

    const totalAmount = vendorAmount + platformFee;

    if (totalAmount > MAX_BIGINT) {
        throw new Error('Total escrow amount exceeds supported range');
    }

    const escrowAccount = await getSystemAccount('PLATFORM_ESCROW');
    const vendorAccount = await getUserAccount(vendorId);

    const entries = [
        {
            accountId: escrowAccount.id,
            direction: 'debit',
            amountKobo: totalAmount.toString()
        },
        {
            accountId: vendorAccount.id,
            direction: 'credit',
            amountKobo: vendorAmount.toString()
        }
    ];

    if (platformFee > 0n) {
        const revenueAccount = await getSystemAccount(
            'PLATFORM_REVENUE'
        );

        entries.push({
            accountId: revenueAccount.id,
            direction: 'credit',
            amountKobo: platformFee.toString()
        });
    }

    const transaction = await postLedgerTransaction({
        trx,
        idempotencyKey,
        reference,
        type: 'ESCROW_RELEASE',
        metadata: {
            ...metadata,
            orderId,
            vendorId,
            totalAmountKobo: totalAmount.toString(),
            vendorAmountKobo: vendorAmount.toString(),
            platformFeeKobo: platformFee.toString()
        },
        entries
    });

    return {
        success: true,
        message: 'Escrow funds released to vendor successfully',
        transaction
    };
};

module.exports = {
    releaseEscrowToVendor
};
