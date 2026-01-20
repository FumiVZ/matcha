const pool = require('../config/db');

/**
 * Middleware to update user's online status
 * Sets is_online to true and updates last_online timestamp
 */
const updateOnlineStatus = async (req, res, next) => {
    // Only update if user is authenticated
    if (req.session && req.session.userId) {
        try {
            // Update user's online status
            await pool.query(
                `UPDATE users 
                 SET is_online = true, last_online = NOW() 
                 WHERE id = $1`,
                [req.session.userId]
            );
        } catch (error) {
            // Log error but don't block the request
            console.error('Error updating online status:', error);
        }
    }
    next();
};

/**
 * Function to set user offline (call this on logout)
 */
const setUserOffline = async (userId) => {
    try {
        await pool.query(
            `UPDATE users 
             SET is_online = false, last_online = NOW() 
             WHERE id = $1`,
            [userId]
        );
    } catch (error) {
        console.error('Error setting user offline:', error);
    }
};

module.exports = { updateOnlineStatus, setUserOffline };
