
jest.mock('../services/userAccount.service', () => ({
    getUserAccount: jest.fn()
}));

jest.mock('../services/systemAccount.service', () => ({
    getSystemAccount: jest.fn()
}));

jest.mock('../services/ledger.service', () => ({
    postLedgerTransaction: jest.fn()
}));

const { getUserAccount } = require('../services/userAccount.service');
const { getSystemAccount } = require('../services/systemAccount.service');
const { postLedgerTransaction } = require('../services/ledger.service');

const {
    releaseEscrowToVendor
} = require('../services/escrowRelease.service');

describe('Escrow Release Service Tests', () => {
    const details = {
        vendorId: 'vendor-101',
        amountKobo: 90000,
        platformFeeKobo: 10000,
        idempotencyKey: 'release-test-001',
        reference: 'ORDER-REF-001',
        orderId: 'order-101',
        metadata: {
            source: 'test'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        getSystemAccount.mockImplementation(async accountName => ({
            id: accountName === 'PLATFORM_ESCROW' ? '10' : '30'
        }));

        getUserAccount.mockResolvedValue({
            id: '20'
        });

        postLedgerTransaction.mockResolvedValue({
            transaction: {
                id: '500',
                status: 'posted'
            }
        });
    });

    it('should reject a missing vendor ID', async () => {
        await expect(
            releaseEscrowToVendor({
                ...details,
                vendorId: null
            })
        ).rejects.toThrow('Vendor ID is required');
    });

    it('should reject a missing order ID', async () => {
        await expect(
            releaseEscrowToVendor({
                ...details,
                orderId: null
            })
        ).rejects.toThrow('Order ID is required');
    });

    it('should reject a non-integer vendor amount', async () => {
        await expect(
            releaseEscrowToVendor({
                ...details,
                amountKobo: 100.5
            })
        ).rejects.toThrow('Vendor amount must be a safe integer');
    });

    it('should reject a zero vendor amount', async () => {
        await expect(
            releaseEscrowToVendor({
                ...details,
                amountKobo: 0
            })
        ).rejects.toThrow('Vendor amount must be greater than zero');
    });

    it('should reject a negative platform fee', async () => {
        await expect(
            releaseEscrowToVendor({
                ...details,
                platformFeeKobo: -100
            })
        ).rejects.toThrow('Platform fee must be a positive integer');
    });

    it('should retrieve the platform escrow account', async () => {
        await releaseEscrowToVendor(details);

        expect(getSystemAccount).toHaveBeenCalledWith('PLATFORM_ESCROW');
    });

    it('should retrieve the vendor account', async () => {
        await releaseEscrowToVendor(details);

        expect(getUserAccount).toHaveBeenCalledWith('vendor-101');
    });

    it('should debit escrow and credit the vendor and platform revenue', async () => {
        await releaseEscrowToVendor(details);

        expect(postLedgerTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'ESCROW_RELEASE',
                entries: [
                    {
                        accountId: '10',
                        direction: 'debit',
                        amountKobo: '100000'
                    },
                    {
                        accountId: '20',
                        direction: 'credit',
                        amountKobo: '90000'
                    },
                    {
                        accountId: '30',
                        direction: 'credit',
                        amountKobo: '10000'
                    }
                ]
            })
        );
    });

    it('should not retrieve revenue account when platform fee is zero', async () => {
        await releaseEscrowToVendor({
            ...details,
            platformFeeKobo: 0
        });

        expect(getSystemAccount).toHaveBeenCalledTimes(1);
        expect(getSystemAccount).toHaveBeenCalledWith('PLATFORM_ESCROW');
    });

    it('should return a successful release response', async () => {
        const result = await releaseEscrowToVendor(details);

        expect(result.success).toBe(true);
        expect(result.message).toBe(
            'Escrow funds released to vendor successfully'
        );
        expect(result.transaction).toBeDefined();
    });
});
              
