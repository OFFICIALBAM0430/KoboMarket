
exports.up = async function (knex) {
    await knex('accounts')
        .insert({
            owner_type: 'system',
            owner_id: 'PLATFORM_PAYOUT_SETTLED',
            currency: 'NGN',
            balance_kobo: 0,
            status: 'active'
        })
        .onConflict(['owner_type', 'owner_id', 'currency'])
        .ignore();
};

exports.down = async function (knex) {
    await knex('accounts')
        .where({
            owner_type: 'system',
            owner_id: 'PLATFORM_PAYOUT_SETTLED',
            currency: 'NGN'
        })
        .whereNotExists(function () {
            this.select('*')
                .from('ledger_entries')
                .whereRaw('ledger_entries.account_id = accounts.id');
        })
        .del();
};
