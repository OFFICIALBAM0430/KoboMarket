jest.mock('../services/paystackPayout.service', () => ({
    createTransferRecipient: jest.fn(),
    initiateBankTransfer: jest.fn()
}));

jest.mock('../services/payoutRecord.service', () => ({
    saveRecipientCode: jest.fn(),
    updatePayoutStatus: jest.fn()
}));

const {
    createTransferRecipient,
    initiateBankTransfer
} = require('../services/paystackPayout.service');

const {
    saveRecipientCode,
    updatePayoutStatus
} = require('../services/payoutRecord.service');

const {
    processPayout
} = require('../services/payoutProcessing.service');

describe('Payout Processing Service', () => {
    const payout = {
        id: 'payout-id-123',
        reference: 'PAYOUT-REF-001',
        amount_kobo: '150000'
    };

    const bankDetails = {
        accountName: 'Test Vendor',
        accountNumber: '0123456789',
        bankCode: '058'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        createTransferRecipient.mockResolvedValue({
            recipientCode: 'RCP_test123'
        });

        saveRecipientCode.mockResolvedValue(true);
        updatePayoutStatus.mockResolvedValue(true);

        initiateBankTransfer.mockResolvedValue({
            reference: 'TRF_test123',
            status: 'pending'
        });
    });

    test('should reject when payout record is missing', async () => {
        await expect(
            processPayout({
                payout: null,
                ...bankDetails
            })
        ).rejects.toThrow('Valid payout record is required');
    });

    test('should reject payout without an ID', async () => {
        await expect(
            processPayout({
                payout: {
                    reference: 'PAYOUT-REF-001'
                },
                ...bankDetails
            })
        ).rejects.toThrow('Valid payout record is required');
    });

    test('should reject payout without a reference', async () => {
        await expect(
            processPayout({
                payout: {
                    id: 'payout-id-123'
                },
                ...bankDetails
            })
        ).rejects.toThrow('Valid payout record is required');
    });

    test('should reject payouts that are not pending', async () => {
        await expect(
            processPayout({
                payout: {
                    ...payout,
                    status: 'processing'
                },
                ...bankDetails
            })
        ).rejects.toThrow('Only pending payouts can be processed');
    });

    test('should create a Paystack transfer recipient', async () => {
        await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(createTransferRecipient).toHaveBeenCalledWith(
            bankDetails
        );
    });

    test('should save the recipient code against the payout', async () => {
        await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(saveRecipientCode).toHaveBeenCalledWith(
            'payout-id-123',
            'RCP_test123'
        );
    });

    test('should update payout status to processing before initiating transfer', async () => {
        await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(updatePayoutStatus).toHaveBeenNthCalledWith(1, {
            payoutId: 'payout-id-123',
            status: 'processing'
        });
    });

    test('should initiate the bank transfer using the payout details', async () => {
        await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(initiateBankTransfer).toHaveBeenCalledWith({
            amountKobo: 150000,
            recipientCode: 'RCP_test123',
            reference: 'PAYOUT-REF-001'
        });
    });

    test('should update payout with the Paystack transfer reference', async () => {
        await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(updatePayoutStatus).toHaveBeenNthCalledWith(2, {
            payoutId: 'payout-id-123',
            status: 'processing',
            providerReference: 'TRF_test123'
        });
    });

    test('should return a successful payout processing response', async () => {
        const result = await processPayout({
            payout: {
                ...payout,
                status: 'pending'
            },
            ...bankDetails
        });

        expect(result).toEqual({
            success: true,
            message: 'Payout transfer initiated',
            payoutReference: 'PAYOUT-REF-001',
            transfer: {
                reference: 'TRF_test123',
                status: 'pending'
            }
        });
    });

    test('should propagate recipient creation errors', async () => {
        createTransferRecipient.mockRejectedValue(
            new Error('Recipient creation failed')
        );

        await expect(
            processPayout({
                payout: {
                    ...payout,
                    status: 'pending'
                },
                ...bankDetails
            })
        ).rejects.toThrow('Recipient creation failed');
    });

    test('should propagate bank transfer errors', async () => {
        initiateBankTransfer.mockRejectedValue(
            new Error('Bank transfer failed')
        );

        await expect(
            processPayout({
                payout: {
                    ...payout,
                    status: 'pending'
                },
                ...bankDetails
            })
        ).rejects.toThrow('Bank transfer failed');
    });
});
