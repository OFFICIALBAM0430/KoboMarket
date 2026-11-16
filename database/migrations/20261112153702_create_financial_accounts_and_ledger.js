exports.up = async function (knex) {
  await knex.schema.createTable('accounts', (table) => {
    table.bigIncrements('id').primary();
    table.string('owner_type', 20).notNullable();
    table.string('owner_id', 100).notNullable();
    table.string('currency', 3).notNullable().defaultTo('NGN');
    table.bigInteger('balance_kobo').notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('active');
    table.timestamps(true, true);
    table.unique(
      ['owner_type', 'owner_id', 'currency'],
      'accounts_owner_currency_unique'
    );
    table.check(
      "owner_type IN ('user', 'system')",
      [],
      'accounts_owner_type_check'
    );
    table.check(
      'balance_kobo >= 0',
      [],
      'accounts_balance_non_negative'
    );
    table.check(
      "status IN ('active', 'frozen', 'closed')",
      [],
      'accounts_status_check'
    );
  });
  await knex.schema.createTable('transactions', (table) => {
    table.bigIncrements('id').primary();
    table.string('reference', 100).notNullable().unique();
    table.string('type', 50).notNullable();
    table.string('status', 30).notNullable().defaultTo('pending');
    table.string('idempotency_key', 150).notNullable().unique();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('type');
    table.index('status');
    table.index('created_at');
  });
  await knex.schema.createTable('ledger_entries', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('transaction_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('transactions')
      .onDelete('RESTRICT');
    table.bigInteger('account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('RESTRICT');
    table.string('direction', 10).notNullable();
    table.bigInteger('amount_kobo').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.check(
      "direction IN ('debit', 'credit')",
      [],
      'ledger_entries_direction_check'
    );
    table.check(
      'amount_kobo > 0',
      [],
      'ledger_entries_amount_positive'
    );
    table.index('transaction_id');
    table.index('account_id');
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ledger_entries');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('accounts');
};