const knex = require("knex");

const db = knex({
    client: "pg", 
    
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
});

module.exports = db;