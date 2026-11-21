
const { getUserAccount } = require('./userAccount.service');
const { getSystemAccount } = require('./systemAccount.service');
const { postLedgerTransaction } = require('./ledger.service');

const transferToEscrow = async ({
    userId,
    amountKobo,
    idempotencyKey,
    reference,
    metadata = {}
}) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!amountKobo) {
        throw new Error('Transfer amount is required');
    }

    const buyerAccount = await getUserAccount(userId);
    const escrowAccount = await getSystemAccount('PLATFORM_ESCROW');

    const transaction = await postLedgerTransaction({
        idempotencyKey,
        reference,
        type: 'ESCROW_FUNDING',
        metadata: {
            ...metadata,
            userId,
            escrowAccount: 'PLATFORM_ESCROW'
        },
        entries: [
            {
                accountId: buyerAccount.id,
                direction: 'debit',
                amountKobo
            },
            {
                accountId: escrowAccount.id,
                direction: 'credit',
                amountKobo
            }
        ]
    });

    return {
        success: true,
        message: 'Funds transferred to escrow successfully',
        transaction
    };
};

module.exports = {
    transferToEscrow
};
