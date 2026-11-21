
exports.up = async function (knex) {
    await knex.schema.createTable('orders', (table) => {
        table.bigIncrements('id').primary();

        table.string('buyer_id', 24).notNullable();

        table.string('reference', 100).notNullable().unique();

        table.string('idempotency_key', 150).notNullable().unique();

        table.bigInteger('total_kobo').notNullable();

        table.string('currency', 3).notNullable().defaultTo('NGN');

        table.string('status', 30).notNullable().defaultTo('pending');

        table.jsonb('shipping_address').notNullable();

        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        table.check('total_kobo > 0');

        table.check(
            "status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded')"
        );

        table.index('buyer_id');
        table.index('status');
        table.index('created_at');
    });

    await knex.schema.createTable('sub_orders', (table) => {
        table.bigIncrements('id').primary();

        table.bigInteger('order_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('orders')
            .onDelete('RESTRICT');

        table.string('vendor_id', 24).notNullable();

        table.string('store_id', 24).notNullable();

        table.bigInteger('subtotal_kobo').notNullable();

        table.bigInteger('platform_fee_kobo').notNullable().defaultTo(0);

        table.bigInteger('vendor_amount_kobo').notNullable();

        table.bigInteger('escrow_amount_kobo').notNullable();

        table.string('status', 30).notNullable().defaultTo('pending');

        table.timestamp('shipped_at');

        table.timestamp('delivered_at');

        table.timestamp('completed_at');

        table.timestamp('escrow_release_at');

        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        table.check('subtotal_kobo > 0');
        table.check('platform_fee_kobo >= 0');
        table.check('vendor_amount_kobo >= 0');
        table.check('escrow_amount_kobo >= 0');

        table.check(
            "status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded')"
        );

        table.unique(['order_id', 'store_id']);

        table.index('vendor_id');
        table.index('status');
        table.index('escrow_release_at');
    });

    await knex.schema.createTable('order_items', (table) => {
        table.bigIncrements('id').primary();

        table.bigInteger('sub_order_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('sub_orders')
            .onDelete('RESTRICT');

        table.string('product_id', 24).notNullable();

        table.string('product_name', 200).notNullable();

        table.bigInteger('unit_price_kobo').notNullable();

        table.integer('quantity').notNullable();

        table.bigInteger('line_total_kobo').notNullable();

        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        table.check('unit_price_kobo > 0');
        table.check('quantity > 0');
        table.check('line_total_kobo > 0');

        table.index('sub_order_id');
        table.index('product_id');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('order_items');
    await knex.schema.dropTableIfExists('sub_orders');
    await knex.schema.dropTableIfExists('orders');
};
                     
