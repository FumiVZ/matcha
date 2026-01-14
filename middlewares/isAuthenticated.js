const pool = require('../config/db');

// Development flag to skip email verification
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

module.exports = async function isAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth'); 
    }
    
    // Check if email is verified (skip in development if flag is set)
    try {
        const result = await pool.query(
            'SELECT email_verified FROM users WHERE id = $1',
            [req.session.userId]
        );
        
        if (result.rows.length === 0) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        
        if (!result.rows[0].email_verified && !SKIP_EMAIL_VERIFICATION) {
            return res.status(403).send('Please verify your email before accessing this page.');
        }
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).send('Authentication error');
    }
};
