
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
    createPayoutRecord: jest.fn()
}));

const { getUserAccount } = require('../services/userAccount.service');
const { getSystemAccount } = require('../services/systemAccount.service');
const { postLedgerTransaction } = require('../services/ledger.service');
const { createPayoutRecord } = require('../services/payoutRecord.service');

const {
    requestPayout,
    MINIMUM_PAYOUT_KOBO
} = require('../services/payout.service');

describe('Payout Service Tests', () => {
    const details = {
        vendorId: 'vendor-101',
        amountKobo: 150000,
        idempotencyKey: 'payout-test-001',
        metadata: {
            source: 'automated-test'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        getUserAccount.mockResolvedValue({ id: '10' });
        getSystemAccount.mockResolvedValue({ id: '20' });

        postLedgerTransaction.mockResolvedValue({
            transaction: {
                id: '500'
            }
        });

        createPayoutRecord.mockResolvedValue({
            id: 'payout-101',
            status: 'pending',
            amount_kobo: '150000'
        });
    });

    it('should expose the minimum payout amount', () => {
        expect(MINIMUM_PAYOUT_KOBO).toBe(100000);
    });

    it('should reject a missing vendor ID', async () => {
        await expect(
            requestPayout({
                ...details,
                vendorId: null
            })
        ).rejects.toThrow('Vendor ID is required');
    });

    it('should reject an amount below the minimum payout', async () => {
        await expect(
            requestPayout({
                ...details,
                amountKobo: 99999
            })
        ).rejects.toThrow('Minimum withdrawal amount is ₦1,000');
    });

    it('should reject a decimal payout amount', async () => {
        await expect(
            requestPayout({
                ...details,
                amountKobo: 100000.5
            })
        ).rejects.toThrow('Minimum withdrawal amount is ₦1,000');
    });

    it('should reject a missing idempotency key', async () => {
        await expect(
            requestPayout({
                ...details,
                idempotencyKey: ''
            })
        ).rejects.toThrow('Invalid idempotency key');
    });

    it('should reject a short idempotency key', async () => {
        await expect(
            requestPayout({
                ...details,
                idempotencyKey: 'short'
            })
        ).rejects.toThrow('Invalid idempotency key');
    });

    it('should retrieve the vendor account', async () => {
        await requestPayout(details);

        expect(getUserAccount).toHaveBeenCalledWith('vendor-101');
    });

    it('should retrieve the payout clearing account', async () => {
        await requestPayout(details);

        expect(getSystemAccount).toHaveBeenCalledWith(
            'PLATFORM_PAYOUT_CLEARING'
        );
    });

    it('should create a balanced payout ledger transaction', async () => {
        await requestPayout(details);

        expect(postLedgerTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                idempotencyKey: 'payout:payout-test-001',
                type: 'PAYOUT_REQUEST',
                entries: [
                    {
                        accountId: '10',
                        direction: 'debit',
                        amountKobo: 150000
                    },
                    {
                        accountId: '20',
                        direction: 'credit',
                        amountKobo: 150000
                    }
                ]
            })
        );
    });

    it('should create a payout record after ledger posting', async () => {
        await requestPayout(details);

        expect(createPayoutRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'vendor-101',
                transactionId: '500',
                amountKobo: 150000,
                idempotencyKey: 'payout-test-001'
            })
        );
    });

    it('should return the payout and transaction', async () => {
        const result = await requestPayout(details);

        expect(result.success).toBe(true);
        expect(result.message).toBe(
            'Withdrawal request created successfully'
        );
        expect(result.payout.id).toBe('payout-101');
        expect(result.transaction.transaction.id).toBe('500');
    });

    it('should reject when the ledger does not return a transaction', async () => {
        postLedgerTransaction.mockResolvedValue({});

        await expect(
            requestPayout(details)
        ).rejects.toThrow('Payout ledger transaction was not returned');

        expect(createPayoutRecord).not.toHaveBeenCalled();
    });
});
                                         
