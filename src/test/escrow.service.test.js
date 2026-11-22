
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
    transferToEscrow
} = require('../services/escrow.service');

describe('KoboMarket Escrow Service Tests', () => {
    const transferDetails = {
        userId: 'buyer-001',
        amountKobo: 50000,
        idempotencyKey: 'escrow-test-001',
        reference: 'ESCROW-REF-001',
        metadata: {
            orderId: 'order-001'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        getUserAccount.mockResolvedValue({
            id: '10'
        });

        getSystemAccount.mockResolvedValue({
            id: '20'
        });

        postLedgerTransaction.mockResolvedValue({
            transaction: {
                id: '100',
                status: 'posted'
            }
        });
    });

    it('should reject a missing user ID', async () => {
        await expect(
            transferToEscrow({
                ...transferDetails,
                userId: null
            })
        ).rejects.toThrow('User ID is required');

        expect(postLedgerTransaction).not.toHaveBeenCalled();
    });

    it('should reject a missing transfer amount', async () => {
        await expect(
            transferToEscrow({
                ...transferDetails,
                amountKobo: null
            })
        ).rejects.toThrow('Transfer amount is required');

        expect(postLedgerTransaction).not.toHaveBeenCalled();
    });

    it('should retrieve the buyer financial account', async () => {
        await transferToEscrow(transferDetails);

        expect(getUserAccount).toHaveBeenCalledWith('buyer-001');
    });

    it('should retrieve the platform escrow account', async () => {
        await transferToEscrow(transferDetails);

        expect(getSystemAccount).toHaveBeenCalledWith('PLATFORM_ESCROW');
    });

    it('should post balanced debit and credit entries', async () => {
        await transferToEscrow(transferDetails);

        expect(postLedgerTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                idempotencyKey: 'escrow-test-001',
                reference: 'ESCROW-REF-001',
                type: 'ESCROW_FUNDING',
                entries: [
                    {
                        accountId: '10',
                        direction: 'debit',
                        amountKobo: 50000
                    },
                    {
                        accountId: '20',
                        direction: 'credit',
                        amountKobo: 50000
                    }
                ]
            })
        );
    });

    it('should include buyer and escrow information in metadata', async () => {
        await transferToEscrow(transferDetails);

        expect(postLedgerTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: {
                    orderId: 'order-001',
                    userId: 'buyer-001',
                    escrowAccount: 'PLATFORM_ESCROW'
                }
            })
        );
    });

    it('should return a successful escrow transfer response', async () => {
        const result = await transferToEscrow(transferDetails);

        expect(result.success).toBe(true);
        expect(result.message).toBe(
            'Funds transferred to escrow successfully'
        );
        expect(result.transaction).toBeDefined();
    });

    it('should propagate errors from the financial account service', async () => {
        getUserAccount.mockRejectedValue(
            new Error('Financial account unavailable')
        );

        await expect(
            transferToEscrow(transferDetails)
        ).rejects.toThrow('Financial account unavailable');
    });

    it('should propagate ledger transaction errors', async () => {
        postLedgerTransaction.mockRejectedValue(
            new Error('Ledger transaction failed')
        );

        await expect(
            transferToEscrow(transferDetails)
        ).rejects.toThrow('Ledger transaction failed');
    });
});
              
