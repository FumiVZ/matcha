const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matcha',
    password: 'secret',
    port: 5432,
});

module.exports = pool;
