
exports.up = async function (knex) {
    await knex.schema.createTable('payout_webhook_events', (table) => {
        table.bigIncrements('id').primary();

        table.string('event_key', 150).notNullable().unique();

        table.string('event_type', 50).notNullable();

        table.string('payout_reference', 100).notNullable();

        table.jsonb('payload').notNullable();

        table.string('status', 20)
            .notNullable()
            .defaultTo('processing');

        table.integer('attempts').notNullable().defaultTo(1);

        table.text('last_error').nullable();

        table.timestamp('processed_at').nullable();

        table.timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('updated_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.check(
            "status IN ('processing', 'processed', 'failed')",
            [],
            'payout_webhook_events_status_check'
        );

        table.index('payout_reference');
        table.index('status');
        table.index('created_at');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('payout_webhook_events');
};
