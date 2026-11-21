
const {
    createTransferRecipient,
    initiateBankTransfer
} = require('./paystackPayout.service');

const {
    saveRecipientCode,
    updatePayoutStatus
} = require('./payoutRecord.service');

const processPayout = async ({
    payout,
    accountName,
    accountNumber,
    bankCode
}) => {
    if (!payout || !payout.id || !payout.reference) {
        throw new Error('Valid payout record is required');
    }

    if (payout.status !== 'pending') {
        throw new Error('Only pending payouts can be processed');
    }

    const recipient = await createTransferRecipient({
        accountName,
        accountNumber,
        bankCode
    });

    await saveRecipientCode(
        payout.id,
        recipient.recipientCode
    );

    await updatePayoutStatus({
        payoutId: payout.id,
        status: 'processing'
    });

    const transfer = await initiateBankTransfer({
        amountKobo: Number(payout.amount_kobo),
        recipientCode: recipient.recipientCode,
        reference: payout.reference
    });

    await updatePayoutStatus({
        payoutId: payout.id,
        status: 'processing',
        providerReference: transfer.reference
    });

    return {
        success: true,
        message: 'Payout transfer initiated',
        payoutReference: payout.reference,
        transfer
    };
};

module.exports = { processPayout };
