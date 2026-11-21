
exports.up = async function (knex) {
    await knex.schema.createTable('payout_requests', (table) => {
        table.bigIncrements('id').primary();

        table.string('user_id', 24).notNullable();

        table.bigInteger('transaction_id')
            .unsigned()
            .notNullable()
            .unique()
            .references('id')
            .inTable('transactions')
            .onDelete('RESTRICT');

        table.bigInteger('reversal_transaction_id')
            .unsigned()
            .nullable()
            .unique()
            .references('id')
            .inTable('transactions')
            .onDelete('RESTRICT');

        table.bigInteger('amount_kobo').notNullable();

        table.string('reference', 100).notNullable().unique();

        table.string('idempotency_key', 150)
            .notNullable()
            .unique();

        table.string('provider_reference', 150)
            .nullable()
            .unique();

        table.string('status', 20)
            .notNullable()
            .defaultTo('pending');

        table.text('failure_reason').nullable();

        table.timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('updated_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.check(
            'amount_kobo > 0',
            [],
            'payout_requests_amount_positive'
        );

        table.check(
            "status IN ('pending', 'processing', 'paid', 'failed', 'reversed')",
            [],
            'payout_requests_status_check'
        );

        table.index('user_id');
        table.index('status');
        table.index('created_at');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('payout_requests');
};
