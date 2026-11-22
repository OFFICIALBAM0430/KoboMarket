jest.mock('../services/userAccount.service', () => ({
    getUserAccount: jest.fn()
}));

jest.mock('../services/systemAccount.service', () => ({
    getSystemAccount: jest.fn()
}));

jest.mock('../services/ledger.service', () => ({
    postLedgerTransaction: jest.fn()
}));

jest.mock('../services/payoutRecord.service', () => ({
    getPayoutByReference: jest.fn()
}));

const { getUserAccount } = require('../services/userAccount.service');
const { getSystemAccount } = require('../services/systemAccount.service');
const { postLedgerTransaction } = require('../services/ledger.service');
const { getPayoutByReference } = require('../services/payoutRecord.service');

const {
    reverseFailedPayout
} = require('../services/payoutReversal.service');

describe('Payout Reversal Service', () => {
    const validData = {
        vendorId: 'vendor-123',
        amountKobo: 150000,
        idempotencyKey: 'reversal-key-12345',
        reference: 'REVERSAL-001',
        originalPayoutReference: 'PAYOUT-001',
        reason: 'PAYOUT_FAILED',
        metadata: {
            source: 'paystack-webhook'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        getPayoutByReference.mockResolvedValue({
            user_id: 'vendor-123',
            amount_kobo: '150000',
            status: 'failed'
        });

        getUserAccount.mockResolvedValue({
            id: 'vendor-account-id'
        });

        getSystemAccount.mockResolvedValue({
            id: 'clearing-account-id'
        });

        postLedgerTransaction.mockResolvedValue({
            id: 'reversal-transaction-id'
        });
    });

    test('should reject when vendor ID is missing', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                vendorId: null
            })
        ).rejects.toThrow('Vendor ID is required');
    });

    test('should reject an invalid reversal amount', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                amountKobo: 0
            })
        ).rejects.toThrow('Invalid payout reversal amount');
    });

    test('should reject a decimal reversal amount', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                amountKobo: 100.5
            })
        ).rejects.toThrow('Invalid payout reversal amount');
    });

    test('should reject an invalid idempotency key', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                idempotencyKey: 'short'
            })
        ).rejects.toThrow('Invalid reversal idempotency key');
    });

    test('should reject an invalid reversal reference', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                reference: ''
            })
        ).rejects.toThrow('Invalid reversal reference');
    });

    test('should reject a reversal reference longer than 100 characters', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                reference: 'R'.repeat(101)
            })
        ).rejects.toThrow('Invalid reversal reference');
    });

    test('should reject when original payout reference is missing', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                originalPayoutReference: ''
            })
        ).rejects.toThrow('Original payout reference is required');
    });

    test('should reject an unsupported reversal reason', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                reason: 'UNKNOWN_REASON'
            })
        ).rejects.toThrow('Invalid payout reversal reason');
    });

    test('should reject invalid metadata', async () => {
        await expect(
            reverseFailedPayout({
                ...validData,
                metadata: []
            })
        ).rejects.toThrow('Invalid reversal metadata');
    });

    test('should retrieve the original payout by reference', async () => {
        await reverseFailedPayout(validData);

        expect(getPayoutByReference).toHaveBeenCalledWith(
            'PAYOUT-001'
        );
    });

    test('should reject when the payout belongs to another vendor', async () => {
        getPayoutByReference.mockResolvedValue({
            user_id: 'another-vendor',
            amount_kobo: '150000',
            status: 'failed'
        });

        await expect(
            reverseFailedPayout(validData)
        ).rejects.toThrow('Payout does not belong to this vendor');
    });

    test('should reject when reversal amount does not match the original payout', async () => {
        getPayoutByReference.mockResolvedValue({
            user_id: 'vendor-123',
            amount_kobo: '200000',
            status: 'failed'
        });

        await expect(
            reverseFailedPayout(validData)
        ).rejects.toThrow(
            'Reversal amount does not match original payout'
        );
    });

    test('should reject payouts that are neither failed nor paid', async () => {
        getPayoutByReference.mockResolvedValue({
            user_id: 'vendor-123',
            amount_kobo: '150000',
            status: 'processing'
        });

        await expect(
            reverseFailedPayout(validData)
        ).rejects.toThrow(
            'Payout must be failed or paid before it can be reversed'
        );
    });

    test('should retrieve vendor and payout clearing accounts', async () => {
        await reverseFailedPayout(validData);

        expect(getUserAccount).toHaveBeenCalledWith('vendor-123');
        expect(getSystemAccount).toHaveBeenCalledWith(
            'PLATFORM_PAYOUT_CLEARING'
        );
    });

    test('should post balanced payout reversal ledger entries', async () => {
        await reverseFailedPayout(validData);

        expect(postLedgerTransaction).toHaveBeenCalledWith({
            idempotencyKey: 'reversal-key-12345',
            reference: 'REVERSAL-001',
            type: 'PAYOUT_REVERSAL',
            metadata: {
                source: 'paystack-webhook',
                vendorId: 'vendor-123',
                originalPayoutReference: 'PAYOUT-001',
                amountKobo: 150000,
                reason: 'PAYOUT_FAILED'
            },
            entries: [
                {
                    accountId: 'clearing-account-id',
                    direction: 'debit',
                    amountKobo: 150000
                },
                {
                    accountId: 'vendor-account-id',
                    direction: 'credit',
                    amountKobo: 150000
                }
            ]
        });
    });

    test('should return a successful reversal response', async () => {
        const result = await reverseFailedPayout(validData);

        expect(result).toEqual({
            success: true,
            message: 'Payout reversal recorded successfully',
            transaction: {
                id: 'reversal-transaction-id'
            }
        });
    });

    test('should propagate ledger errors', async () => {
        postLedgerTransaction.mockRejectedValue(
            new Error('Reversal ledger failed')
        );

        await expect(
            reverseFailedPayout(validData)
        ).rejects.toThrow('Reversal ledger failed');
    });
});
