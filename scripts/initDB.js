const pool = require('../config/db');

(async () => {
    try {
        await pool.query('DROP TABLE IF EXISTS users;');
        console.log('Table users dropped!');
        
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                last_logout TIMESTAMP,
                score INT DEFAULT 1000
            );
        `);
        console.log('Table users created with last_logout and score columns!');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();