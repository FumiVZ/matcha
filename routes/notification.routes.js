const express = require('express');
const pool = require('../config/db');
const { deleteNotificationsByType } = require('../services/notification.service');
const isAuthenticated = require('../middlewares/isAuthenticated');
const router = express.Router();

// GET /notifications - Get all unread notifications for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, type, message, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [req.session.userId]
        );
        
        res.json({ 
            notifications: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// DELETE /notifications/:type - Delete all notifications of a specific type for the authenticated user
router.delete('/:type', isAuthenticated, async (req, res) => {
    const { type } = req.params;
    
    try {
        const deletedCount = await deleteNotificationsByType(req.session.userId, type);
        
        res.json({ 
            success: true,
            message: `Deleted ${deletedCount} notification(s) of type '${type}'`,
            deletedCount
        });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
    }
});

module.exports = router;
