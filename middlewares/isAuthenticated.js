module.exports = function isAuthenticated(req, res, next) {
    if (!req.session.userId) {
        // Check if request expects JSON response
        if (req.headers.accept?.includes('application/json') || req.path.startsWith('/notifications')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/auth'); 
    }
    next();
};