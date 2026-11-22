
exports.up = async (knex) => {
    await knex.schema.createTable('disputes', (table) => {
        table.bigIncrements('id').primary();

        table.bigInteger('sub_order_id')
            .unsigned()
            .notNullable()
            .unique()
            .references('id')
            .inTable('sub_orders')
            .onDelete('RESTRICT');

        table.string('buyer_id', 24).notNullable();
        table.string('vendor_id', 24).notNullable();

        table.string('reason', 150).notNullable();
        table.text('description').notNullable();

        table.string('status', 20)
            .notNullable()
            .defaultTo('open');

        table.string('resolution', 30).nullable();

        table.bigInteger('refund_amount_kobo')
            .notNullable()
            .defaultTo(0);

        table.string('admin_id', 24).nullable();

        table.text('admin_note').nullable();

        table.string('ledger_reference', 120).nullable().unique();

        table.timestamp('resolved_at', { useTz: true }).nullable();

        table.timestamps(true, true);

        table.check(
            "status IN ('open', 'resolved')",
            [],
            'disputes_status_check'
        );

        table.check(
            "resolution IS NULL OR resolution IN ('full_refund', 'partial_refund', 'rejected')",
            [],
            'disputes_resolution_check'
        );

        table.check(
            'refund_amount_kobo >= 0',
            [],
            'disputes_refund_amount_check'
        );

        table.index(['buyer_id', 'status']);
        table.index(['vendor_id', 'status']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTableIfExists('disputes');
};
