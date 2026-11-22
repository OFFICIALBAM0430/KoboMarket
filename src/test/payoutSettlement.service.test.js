
jest.mock('../services/systemAccount.service', () => ({
    getSystemAccount: jest.fn()
}));

jest.mock('../services/ledger.service', () => ({
    postLedgerTransaction: jest.fn()
}));

const { getSystemAccount } = require('../services/systemAccount.service');
const { postLedgerTransaction } = require('../services/ledger.service');

const {
    settleSuccessfulPayout,
    restoreReversedPayoutToClearing
} = require('../services/payoutSettlement.service');

describe('Payout Settlement Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        getSystemAccount.mockImplementation(async name => ({
            id: name === 'PLATFORM_PAYOUT_CLEARING' ? '10' : '20'
        }));

        postLedgerTransaction.mockResolvedValue({
            id: 'transaction-101',
            status: 'posted'
        });
    });

    describe('settleSuccessfulPayout', () => {
        const details = {
            amountKobo: 150000,
            reference: 'PAY-REF-101',
            idempotencyKey: 'settlement-test-001'
        };

        it('should reject an invalid settlement amount', async () => {
            await expect(
                settleSuccessfulPayout({
                    ...details,
                    amountKobo: 0
                })
            ).rejects.toThrow('Invalid payout settlement amount');
        });

        it('should reject a decimal settlement amount', async () => {
            await expect(
                settleSuccessfulPayout({
                    ...details,
                    amountKobo: 150000.5
                })
            ).rejects.toThrow('Invalid payout settlement amount');
        });

        it('should require a reference and idempotency key', async () => {
            await expect(
                settleSuccessfulPayout({
                    amountKobo: 150000,
                    reference: '',
                    idempotencyKey: ''
                })
            ).rejects.toThrow(
                'Settlement reference and idempotency key are required'
            );
        });

        it('should retrieve the clearing account', async () => {
            await settleSuccessfulPayout(details);

            expect(getSystemAccount).toHaveBeenCalledWith(
                'PLATFORM_PAYOUT_CLEARING'
            );
        });

        it('should retrieve the settled account', async () => {
            await settleSuccessfulPayout(details);

            expect(getSystemAccount).toHaveBeenCalledWith(
                'PLATFORM_PAYOUT_SETTLED'
            );
        });

        it('should post the payout settlement ledger transaction', async () => {
            await settleSuccessfulPayout(details);

            expect(postLedgerTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    reference: 'SETTLE-PAY-REF-101',
                    idempotencyKey: 'payout-settlement:settlement-test-001',
                    type: 'PAYOUT_SETTLEMENT',
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
    });

    describe('restoreReversedPayoutToClearing', () => {
        const details = {
            amountKobo: 150000,
            reference: 'PAY-REF-101',
            idempotencyKey: 'restore-test-001'
        };

        it('should reject an invalid reversed payout amount', async () => {
            await expect(
                restoreReversedPayoutToClearing({
                    ...details,
                    amountKobo: -1
                })
            ).rejects.toThrow('Invalid reversed payout amount');
        });

        it('should require a reference and idempotency key', async () => {
            await expect(
                restoreReversedPayoutToClearing({
                    amountKobo: 150000,
                    reference: '',
                    idempotencyKey: ''
                })
            ).rejects.toThrow(
                'Reversal reference and idempotency key are required'
            );
        });

        it('should post the restore transaction with reversed entries', async () => {
            await restoreReversedPayoutToClearing(details);

            expect(postLedgerTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    reference: 'RESTORE-PAY-REF-101',
                    idempotencyKey: 'payout-restore:restore-test-001',
                    type: 'PAYOUT_RESTORE',
                    entries: [
                        {
                            accountId: '20',
                            direction: 'debit',
                            amountKobo: 150000
                        },
                        {
                            accountId: '10',
                            direction: 'credit',
                            amountKobo: 150000
                        }
                    ]
                })
            );
        });
    });
});
                  
