const pool = require('../config/db');

(async () => {
    try {
        await pool.query('DROP TABLE IF EXISTS users;');
        console.log('Table users dropped!');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();