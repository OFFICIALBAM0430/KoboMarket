exports.up = function (knex) {
    return knex.schema.createTable('wallets', (table) => {
        table.bigIncrements('id').primary();

        table.string('user_id', 24).notNullable().unique();

        table.decimal('balance', 20, 2).notNullable().defaultTo(0);

        table.string('currency', 3).notNullable().defaultTo('NGN');

        table.enu('status', ['active', 'frozen', 'closed'])
            .notNullable()
            .defaultTo('active');

        table.timestamps(true, true);

        table.index('status');
    });
};
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('wallets');
};