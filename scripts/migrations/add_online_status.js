const pool = require('../../config/db');

async function addOnlineStatusColumns() {
    try {
        console.log('Adding is_online and last_seen columns to users table...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        
        console.log('✓ Columns added successfully!');
        
        // Update existing users with default values
        await pool.query(`
            UPDATE users 
            SET last_seen = CURRENT_TIMESTAMP 
            WHERE last_seen IS NULL
        `);
        
        console.log('✓ Updated existing users with default values');
        
    } catch (error) {
        console.error('Error adding online status columns:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run only if executed directly
if (require.main === module) {
    addOnlineStatusColumns()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = addOnlineStatusColumns;
