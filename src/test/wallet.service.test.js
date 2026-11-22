jest.mock('../repositories/wallet.repository', () => ({
    createUserAccount: jest.fn(),
    deleteUserAccount: jest.fn(),
    getUserAccount: jest.fn()
}));

const walletRepository = require('../repositories/wallet.repository');

const {
    createUserAccount,
    deleteUserAccount,
    getUserAccount
} = require('../services/wallet.service');

describe('Wallet Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createUserAccount', () => {
        it('should reject a missing user ID', async () => {
            await expect(createUserAccount(null))
                .rejects.toThrow('User ID is required to create an account');

            expect(walletRepository.createUserAccount).not.toHaveBeenCalled();
        });

        it('should create a wallet for a valid user', async () => {
            walletRepository.createUserAccount.mockResolvedValue({
                id: '101',
                owner_id: 'user-101',
                currency: 'NGN'
            });

            const result = await createUserAccount('user-101');

            expect(walletRepository.createUserAccount)
                .toHaveBeenCalledWith('user-101');

            expect(result.id).toBe('101');
        });
    });

    describe('deleteUserAccount', () => {
        it('should reject a missing user ID', async () => {
            await expect(deleteUserAccount(null))
                .rejects.toThrow('User ID is required to delete an account');

            expect(walletRepository.deleteUserAccount).not.toHaveBeenCalled();
        });

        it('should delete a wallet for a valid user', async () => {
            walletRepository.deleteUserAccount.mockResolvedValue(true);

            const result = await deleteUserAccount('user-101');

            expect(walletRepository.deleteUserAccount)
                .toHaveBeenCalledWith('user-101');

            expect(result).toBe(true);
        });
    });

    describe('getUserAccount', () => {
        it('should reject a missing user ID', async () => {
            await expect(getUserAccount(null))
                .rejects.toThrow('User ID is required to retrieve an account');

            expect(walletRepository.getUserAccount).not.toHaveBeenCalled();
        });

        it('should retrieve a wallet for a valid user', async () => {
            walletRepository.getUserAccount.mockResolvedValue({
                id: '101',
                owner_id: 'user-101',
                balance_kobo: '250000',
                currency: 'NGN'
            });

            const result = await getUserAccount('user-101');

            expect(walletRepository.getUserAccount)
                .toHaveBeenCalledWith('user-101');

            expect(result.balance_kobo).toBe('250000');
        });

        it('should propagate repository errors', async () => {
            walletRepository.getUserAccount.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(getUserAccount('user-101'))
                .rejects.toThrow('Database unavailable');
        });
    });
});
                   
