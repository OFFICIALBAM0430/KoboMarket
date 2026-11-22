
jest.mock('../config/postgres', () => ({
    transaction: jest.fn()
}));

const db = require('../config/postgres');
const {
    postLedgerTransaction
} = require('../services/ledger.service');

describe('KoboMarket Financial Ledger Tests', () => {
    const validTransaction = {
        idempotencyKey: 'test-payment-001',
        type: 'WALLET_TRANSFER',
        reference: 'TEST-REF-001',
        metadata: { source: 'automated-test' },
        entries: [
            {
                accountId: '1',
                direction: 'debit',
                amountKobo: 50000
            },
            {
                accountId: '2',
                direction: 'credit',
                amountKobo: 50000
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reject a missing idempotency key', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                idempotencyKey: ''
            })
        ).rejects.toThrow('A valid idempotency key is required');
    });

    it('should reject an invalid transaction type', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                type: ''
            })
        ).rejects.toThrow('A valid transaction type is required');
    });

    it('should reject a missing reference', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                reference: ''
            })
        ).rejects.toThrow('A valid transaction reference is required');
    });

    it('should reject fewer than two entries', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [validTransaction.entries[0]]
            })
        ).rejects.toThrow('At least two ledger entries are required');
    });

    it('should reject an invalid entry direction', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: '1',
                        direction: 'invalid',
                        amountKobo: 50000
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: 50000
                    }
                ]
            })
        ).rejects.toThrow('Entry direction must be debit or credit');
    });

    it('should reject zero amounts', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: '1',
                        direction: 'debit',
                        amountKobo: 0
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: 0
                    }
                ]
            })
        ).rejects.toThrow('Amount is outside the supported range');
    });

    it('should reject negative amounts', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: '1',
                        direction: 'debit',
                        amountKobo: -100,
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: -100,
                    }
                ]
            })
        ).rejects.toThrow();
    });

    it('should reject decimal amounts', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: '1',
                        direction: 'debit',
                        amountKobo: 500.50
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: 500.50
                    }
                ]
            })
        ).rejects.toThrow('Amount must be a positive integer in kobo');
    });

    it('should reject an invalid account ID', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: 'abc',
                        direction: 'debit',
                        amountKobo: 50000
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: 50000
                    }
                ]
            })
        ).rejects.toThrow('Invalid account ID');
    });

    it('should reject unbalanced ledger entries', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: [
                    {
                        accountId: '1',
                        direction: 'debit',
                        amountKobo: 50000
                    },
                    {
                        accountId: '2',
                        direction: 'credit',
                        amountKobo: 30000
                    }
                ]
            })
        ).rejects.toThrow('Ledger transaction is not balanced');
    });

    it('should not start a database transaction when validation fails', async () => {
        await expect(
            postLedgerTransaction({
                ...validTransaction,
                entries: []
            })
        ).rejects.toThrow();

        expect(db.transaction).not.toHaveBeenCalled();
    });
});
