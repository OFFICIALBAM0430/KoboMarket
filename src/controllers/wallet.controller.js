
const { getUserAccount } = require('../services/wallet.service');

const getMyWallet = async (req, res) => {
    try {
        const userId = req.user._id;

        const account = await getUserAccount(userId);

        if (!account) {
            return res.status(404).json({
                message: 'Wallet not found'
            });
        }

        return res.status(200).json({
            message: 'Wallet retrieved successfully',
            data: {
                id: account.id,
                balanceKobo: account.balance_kobo,
                currency: account.currency,
                status: account.status,
                createdAt: account.created_at,
                updatedAt: account.updated_at
            }
        });
    } catch (error) {
        console.error('Get wallet error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve wallet'
        });
    }
};

module.exports = { getMyWallet };
