const walletRepository = require('../repositories/wallet.repository');
//
const createUserAccount = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required to create an account');
    }
    return walletRepository.createUserAccount(userId.toString());
};

const deleteUserAccount = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required to delete an account');
    }
    return walletRepository.deleteUserAccount(userId.toString());
};

const getUserAccount = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required to retrieve an account');
    }
    return walletRepository.getUserAccount(userId.toString());
};
module.exports = {
    createUserAccount,
    deleteUserAccount,
    getUserAccount,
};