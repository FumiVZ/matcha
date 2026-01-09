const pool = require('../config/db');

module.exports = async function isAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth'); 
    }
    
    // Check if email is verified
    try {
        const result = await pool.query(
            'SELECT email_verified FROM users WHERE id = $1',
            [req.session.userId]
        );
        
        if (result.rows.length === 0) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        
        if (!result.rows[0].email_verified) {
            return res.status(403).send('Please verify your email before accessing this page.');
        }
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).send('Authentication error');
    }
};
