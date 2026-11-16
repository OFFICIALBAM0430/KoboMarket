require('dotenv').config();

const path = require('path');

module.exports = {
    development: {
        client: 'pg',

        connection: {
            host: process.env.PGHOST,
            port: Number(process.env.PGPORT),
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
        },

        pool: {
            min: 2,
            max: 10,
        },

        migrations: {
            directory: path.resolve(__dirname, 'database/migrations'),
        },

        seed: {
            directory: path.resolve(__dirname, 'databse/seeds'),
        },
    },
};