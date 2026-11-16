const db = require('../config/postgres');

const createUserAccount = async (userId) => {
    const [account] = await db('accounts')
        .insert({
            owner_type: 'user',
            owner_id: userId,
            currency: 'NGN',
        })
        .returning([
            'id',
            'owner_type',
            'owner_id',
            'currency',
            'balance_kobo',
            'status',
            'created_at',
            'updated_at',
        ]);
    return account;
};

const deleteUserAccount = async (userId) => {
    return db('accounts')
        .where({
            owner_type: 'user',
            owner_id: userId,
        })
        .del();
};

const getUserAccount = async (userId) => {
    return db('accounts')
        .where({
            owner_type: 'user',
            owner_id: userId,
        })
        .where({ currency: 'NGN' })
        .first();
};
module.exports = {
    createUserAccount,
    deleteUserAccount,
    getUserAccount,
};