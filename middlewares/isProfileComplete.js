const pool = require('../config/db');

const isProfileComplete = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth');
    }

    try {
        const result = await pool.query(
            'SELECT profile_complete FROM users WHERE id = $1',
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            return res.redirect('/auth');
        }

        const user = result.rows[0];
        
        if (!user.profile_complete) {
            return res.redirect('/profile/setup');
        }

        next();
    } catch (error) {
        console.error('Error checking profile completion:', error);
        res.status(500).send('Server error');
    }
};

module.exports = isProfileComplete;
