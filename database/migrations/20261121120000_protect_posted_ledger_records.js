
exports.up = async function (knex) {
    await knex.raw(`
        CREATE OR REPLACE FUNCTION prevent_posted_ledger_entry_changes()
        RETURNS TRIGGER AS $$
        DECLARE
            transaction_status VARCHAR(30);
        BEGIN
            IF TG_OP = 'UPDATE' AND
               NEW.transaction_id <> OLD.transaction_id THEN
                RAISE EXCEPTION
                    'Ledger entries cannot be moved between transactions'
                    USING ERRCODE = '55000';
            END IF;

            SELECT status
            INTO transaction_status
            FROM transactions
            WHERE id = CASE
                WHEN TG_OP = 'DELETE' THEN OLD.transaction_id
                ELSE NEW.transaction_id
            END
            FOR UPDATE;

            IF transaction_status = 'posted' THEN
                RAISE EXCEPTION
                    'Posted ledger entries cannot be inserted, modified or deleted'
                    USING ERRCODE = '55000';
            END IF;

            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
        CREATE TRIGGER protect_posted_ledger_entries
        BEFORE INSERT OR UPDATE OR DELETE ON ledger_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_posted_ledger_entry_changes();
    `);

    await knex.raw(`
        CREATE OR REPLACE FUNCTION prevent_posted_transaction_changes()
        RETURNS TRIGGER AS $$
        BEGIN
            IF OLD.status = 'posted' THEN
                RAISE EXCEPTION
                    'Posted transactions cannot be modified or deleted'
                    USING ERRCODE = '55000';
            END IF;

            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
        CREATE TRIGGER protect_posted_transactions
        BEFORE UPDATE OR DELETE ON transactions
        FOR EACH ROW
        EXECUTE FUNCTION prevent_posted_transaction_changes();
    `);
};

exports.down = async function (knex) {
    await knex.raw(`
        DROP TRIGGER IF EXISTS protect_posted_ledger_entries
        ON ledger_entries;
    `);

    await knex.raw(`
        DROP TRIGGER IF EXISTS protect_posted_transactions
        ON transactions;
    `);

    await knex.raw(`
        DROP FUNCTION IF EXISTS prevent_posted_ledger_entry_changes();
    `);

    await knex.raw(`
        DROP FUNCTION IF EXISTS prevent_posted_transaction_changes();
    `);
};
