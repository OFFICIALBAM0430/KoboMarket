exports.up = async function (knex) {
  await knex.raw(`
    INSERT INTO accounts (
      owner_type,
      owner_id,
      currency,
      balance_kobo,
      status,
      created_at,
      updated_at
    )
    SELECT
      'user',
      user_id,
      currency,
      ROUND(balance * 100)::BIGINT,
      status,
      created_at,
      updated_at
    FROM wallets
    ON CONFLICT (owner_type, owner_id, currency)
    DO NOTHING;
  `);
 
  await knex('accounts').insert([
    {
      owner_type: 'system',
      owner_id: 'PLATFORM_ESCROW',
      currency: 'NGN',
      balance_kobo: 0,
      status: 'active',
    },
    {
      owner_type: 'system',
      owner_id: 'PLATFORM_REVENUE',
      currency: 'NGN',
      balance_kobo: 0,
      status: 'active',
    },
    {
      owner_type: 'system',
      owner_id: 'PLATFORM_PAYOUT_CLEARING',
      currency: 'NGN',
      balance_kobo: 0,
      status: 'active',
    },
  ]).onConflict(['owner_type', 'owner_id', 'currency']).ignore();
};
exports.down = async function () {
};