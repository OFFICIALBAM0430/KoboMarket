
const User = require('../models/user.model');
const VendorStore = require('../models/vendorStore.model');

const { requestPayout } = require('../services/payout.service');

const {
    resolveBankAccount,
    createTransferRecipient,
    initiateTransfer
} = require('../services/paystackTransfer.service');

const {
    updatePayoutStatus,
    saveRecipientCode,
    getPayoutByIdempotencyKey
} = require('../services/payoutRecord.service');

const { reverseFailedPayout } = require('../services/payoutReversal.service');

const submitPayout = async (req, res) => {
    let payoutRecord = null;
    let transferRequestStarted = false;

    try {
        const { amountKobo, accountNumber, bankCode, idempotencyKey } = req.body;
        const vendorId = String(req.user._id);

        if (
            typeof amountKobo !== 'number' ||
            !Number.isSafeInteger(amountKobo) ||
            amountKobo < 100000
        ) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal amount is ₦1,000. Amount must be an integer in kobo.'
            });
        }

        if (
            typeof accountNumber !== 'string' ||
            !/^\d{10}$/.test(accountNumber) ||
            typeof bankCode !== 'string' ||
            !bankCode.trim() ||
            typeof idempotencyKey !== 'string' ||
            idempotencyKey.trim().length < 10
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid account number, bank code and idempotency key are required'
            });
        }

        
        const normalizedIdempotencyKey = idempotencyKey.trim();

        const existingPayout = await getPayoutByIdempotencyKey(
            normalizedIdempotencyKey
        );

        if (existingPayout) {
            if (
                existingPayout.user_id !== vendorId ||
                String(existingPayout.amount_kobo) !== String(amountKobo)
            ) {
                return res.status(409).json({
                    success: false,
                    message: 'Idempotency key has already been used with different payout details.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'This payout request has already been processed or submitted.',
                data: {
                    reference: existingPayout.reference,
                    amountKobo: Number(existingPayout.amount_kobo),
                    status: existingPayout.status
                }
            });
        }
        

        const store = await VendorStore.findOne({
            owner: req.user._id,
            status: 'active'
        });

        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Only vendors with active stores can request payouts'
            });
        }

        const user = await User.findById(req.user._id).select('email');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

      
        const bankAccount = await resolveBankAccount({
            accountNumber,
            bankCode: bankCode.trim()
        });

  
        const recipient = await createTransferRecipient({
            accountNumber,
            bankCode: bankCode.trim(),
            accountName: bankAccount.account_name,
            email: user.email
        });

      
        const result = await requestPayout({
            vendorId,
            amountKobo,
            idempotencyKey: idempotencyKey.trim(),
            metadata: {
                bankCode: bankCode.trim(),
                accountNumberLast4: accountNumber.slice(-4)
            }
        });

        payoutRecord = result.payout;

      
        await updatePayoutStatus({
            payoutId: payoutRecord.id,
            status: 'processing'
        });

        await saveRecipientCode(
            payoutRecord.id,
            recipient.recipient_code
        );

        transferRequestStarted = true;

        const transfer = await initiateTransfer({
            amountKobo,
            recipientCode: recipient.recipient_code,
            reference: payoutRecord.reference,
            reason: `KoboMarket vendor payout ${payoutRecord.reference}`
        });

        return res.status(202).json({
            success: true,
            message: 'Payout submitted to Paystack. Awaiting transfer confirmation.',
            data: {
                reference: payoutRecord.reference,
                amountKobo,
                status: 'processing',
                transferCode: transfer.transfer_code || null
            }
        });

    } catch (error) {
        console.error('Payout request error:', error);

        
        const definiteFailure =
            !transferRequestStarted || Boolean(error.response);

        if (payoutRecord && definiteFailure) {
            try {
                await updatePayoutStatus({
                    payoutId: payoutRecord.id,
                    status: 'failed',
                    failureReason: error.message
                });

                const reversal = await reverseFailedPayout({
                    vendorId: String(req.user._id),
                    amountKobo: Number(payoutRecord.amount_kobo),
                    idempotencyKey: `payout-reversal:${payoutRecord.reference}`,
                    reference: `REV-${payoutRecord.reference}`,
                    originalPayoutReference: payoutRecord.reference,
                    reason: 'PAYOUT_FAILED'
                });

                await updatePayoutStatus({
                    payoutId: payoutRecord.id,
                    status: 'reversed',
                    reversalTransactionId: String(
                        reversal.transaction.transaction.id
                    )
                });
            } catch (reversalError) {
                console.error('Payout reversal error:', reversalError);
            }
        }

        if (payoutRecord && transferRequestStarted && !error.response) {
            return res.status(202).json({
                success: true,
                message: 'Transfer submission outcome is being reconciled. Check payout status before retrying.',
                data: {
                    reference: payoutRecord.reference,
                    status: 'processing'
                }
            });
        }

        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || 'Unable to process payout request'
        });
    }
};

module.exports = { submitPayout };
  
