const express = require('express');
const pool = require('../config/db');
const isAuthenticated = require('../middlewares/isAuthenticated');

const router = express.Router();

// Fame rating changes
const FAME_LIKE_RECEIVED = 10;
const FAME_UNLIKE_RECEIVED = -10;
const FAME_MATCH = 20;
const FAME_UNMATCH = -20;

// Helper function to update fame rating
async function updateFameRating(userId, change) {
    await pool.query(
        `UPDATE users SET popularity_score = GREATEST(0, popularity_score + $1) WHERE id = $2`,
        [change, userId]
    );
}

// POST /likes/:id - Like a user
router.post('/:id', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        const likerId = req.session.userId;
        const likedId = parseInt(req.params.id);
        
        // Can't like yourself
        if (likerId === likedId) {
            return res.status(400).json({ error: 'You cannot like yourself' });
        }
        
        // Check if user exists and has complete profile
        const userResult = await client.query(
            `SELECT id FROM users WHERE id = $1 AND profile_complete = true AND email_verified = true`,
            [likedId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if already liked
        const existingLike = await client.query(
            `SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2`,
            [likerId, likedId]
        );
        
        if (existingLike.rows.length > 0) {
            return res.status(400).json({ error: 'You already liked this user' });
        }
        
        // Check if blocked
        const blockedCheck = await client.query(
            `SELECT id FROM blocks WHERE 
             (blocker_id = $1 AND blocked_id = $2) OR 
             (blocker_id = $2 AND blocked_id = $1)`,
            [likerId, likedId]
        );
        
        if (blockedCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot like this user' });
        }
        
        await client.query('BEGIN');
        
        // Insert the like
        await client.query(
            `INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2)`,
            [likerId, likedId]
        );
        
        // Update fame rating for liked user
        await client.query(
            `UPDATE users SET popularity_score = GREATEST(0, popularity_score + $1) WHERE id = $2`,
            [FAME_LIKE_RECEIVED, likedId]
        );
        
        // Check if this creates a match (mutual like)
        const mutualLike = await client.query(
            `SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2`,
            [likedId, likerId]
        );
        
        let isMatch = false;
        if (mutualLike.rows.length > 0) {
            // It's a match! Insert into matches table
            // Always store with lower ID first to avoid duplicates
            const user1 = Math.min(likerId, likedId);
            const user2 = Math.max(likerId, likedId);
            
            await client.query(
                `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)
                 ON CONFLICT (user1_id, user2_id) DO NOTHING`,
                [user1, user2]
            );
            
            // Bonus fame for both users on match
            await client.query(
                `UPDATE users SET popularity_score = GREATEST(0, popularity_score + $1) WHERE id IN ($2, $3)`,
                [FAME_MATCH, likerId, likedId]
            );
            
            isMatch = true;
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: isMatch ? 'It\'s a match!' : 'User liked successfully',
            isMatch 
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error liking user:', error);
        res.status(500).json({ error: 'Error liking user' });
    } finally {
        client.release();
    }
});

// DELETE /likes/:id - Unlike a user
router.delete('/:id', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        const likerId = req.session.userId;
        const likedId = parseInt(req.params.id);
        
        // Check if like exists
        const existingLike = await client.query(
            `SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2`,
            [likerId, likedId]
        );
        
        if (existingLike.rows.length === 0) {
            return res.status(400).json({ error: 'You have not liked this user' });
        }
        
        await client.query('BEGIN');
        
        // Check if there was a match before unliking
        const user1 = Math.min(likerId, likedId);
        const user2 = Math.max(likerId, likedId);
        
        const existingMatch = await client.query(
            `SELECT id FROM matches WHERE user1_id = $1 AND user2_id = $2`,
            [user1, user2]
        );
        
        const wasMatch = existingMatch.rows.length > 0;
        
        // Remove the like
        await client.query(
            `DELETE FROM likes WHERE liker_id = $1 AND liked_id = $2`,
            [likerId, likedId]
        );
        
        // Update fame rating for unliked user
        await client.query(
            `UPDATE users SET popularity_score = GREATEST(0, popularity_score + $1) WHERE id = $2`,
            [FAME_UNLIKE_RECEIVED, likedId]
        );
        
        // If there was a match, remove it and penalize both users
        if (wasMatch) {
            await client.query(
                `DELETE FROM matches WHERE user1_id = $1 AND user2_id = $2`,
                [user1, user2]
            );
            
            // Fame penalty for breaking match
            await client.query(
                `UPDATE users SET popularity_score = GREATEST(0, popularity_score + $1) WHERE id IN ($2, $3)`,
                [FAME_UNMATCH, likerId, likedId]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: wasMatch ? 'Match removed' : 'User unliked successfully',
            wasMatch
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error unliking user:', error);
        res.status(500).json({ error: 'Error unliking user' });
    } finally {
        client.release();
    }
});

// GET /likes/status/:id - Check if current user liked a specific user
router.get('/status/:id', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const targetUserId = parseInt(req.params.id);
        
        // Check if current user liked the target
        const likeResult = await pool.query(
            `SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2`,
            [currentUserId, targetUserId]
        );
        
        // Check if target user liked back (is it a match?)
        const user1 = Math.min(currentUserId, targetUserId);
        const user2 = Math.max(currentUserId, targetUserId);
        
        const matchResult = await pool.query(
            `SELECT id FROM matches WHERE user1_id = $1 AND user2_id = $2`,
            [user1, user2]
        );
        
        // Check if blocked
        const blockResult = await pool.query(
            `SELECT id, blocker_id FROM blocks WHERE 
             (blocker_id = $1 AND blocked_id = $2) OR 
             (blocker_id = $2 AND blocked_id = $1)`,
            [currentUserId, targetUserId]
        );
        
        let blockStatus = null;
        if (blockResult.rows.length > 0) {
            blockStatus = blockResult.rows[0].blocker_id === currentUserId ? 'blocked_by_me' : 'blocked_by_them';
        }
        
        res.json({
            liked: likeResult.rows.length > 0,
            isMatch: matchResult.rows.length > 0,
            blockStatus
        });
        
    } catch (error) {
        console.error('Error checking like status:', error);
        res.status(500).json({ error: 'Error checking like status' });
    }
});

// GET /likes/received - Get users who liked me
router.get('/received', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        
        const result = await pool.query(
            `SELECT u.id, u.first_name, u.name, l.created_at,
                    (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
             FROM likes l
             JOIN users u ON l.liker_id = u.id
             WHERE l.liked_id = $1
               AND u.profile_complete = true
               AND u.email_verified = true
             ORDER BY l.created_at DESC
             LIMIT 50`,
            [currentUserId]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching received likes:', error);
        res.status(500).json({ error: 'Error fetching received likes' });
    }
});

// GET /likes/sent - Get users I liked
router.get('/sent', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        
        const result = await pool.query(
            `SELECT u.id, u.first_name, u.name, l.created_at,
                    (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
             FROM likes l
             JOIN users u ON l.liked_id = u.id
             WHERE l.liker_id = $1
               AND u.profile_complete = true
               AND u.email_verified = true
             ORDER BY l.created_at DESC
             LIMIT 50`,
            [currentUserId]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching sent likes:', error);
        res.status(500).json({ error: 'Error fetching sent likes' });
    }
});

// GET /likes/matches - Get all matches
router.get('/matches', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        
        const result = await pool.query(
            `SELECT 
                CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END as id,
                u.first_name, u.name, m.matched_at,
                (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
             FROM matches m
             JOIN users u ON u.id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
             WHERE (m.user1_id = $1 OR m.user2_id = $1)
               AND u.profile_complete = true
               AND u.email_verified = true
             ORDER BY m.matched_at DESC`,
            [currentUserId]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Error fetching matches' });
    }
});

// POST /likes/block/:id - Block a user
router.post('/block/:id', isAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        const blockerId = req.session.userId;
        const blockedId = parseInt(req.params.id);
        
        if (blockerId === blockedId) {
            return res.status(400).json({ error: 'You cannot block yourself' });
        }
        
        // Check if user exists
        const userResult = await client.query(
            `SELECT id FROM users WHERE id = $1`,
            [blockedId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await client.query('BEGIN');
        
        // Add block
        await client.query(
            `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
             ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
            [blockerId, blockedId]
        );
        
        // Remove any likes between these users
        await client.query(
            `DELETE FROM likes WHERE 
             (liker_id = $1 AND liked_id = $2) OR 
             (liker_id = $2 AND liked_id = $1)`,
            [blockerId, blockedId]
        );
        
        // Remove any match
        const user1 = Math.min(blockerId, blockedId);
        const user2 = Math.max(blockerId, blockedId);
        
        await client.query(
            `DELETE FROM matches WHERE user1_id = $1 AND user2_id = $2`,
            [user1, user2]
        );
        
        await client.query('COMMIT');
        
        res.json({ success: true, message: 'User blocked' });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error blocking user:', error);
        res.status(500).json({ error: 'Error blocking user' });
    } finally {
        client.release();
    }
});

// DELETE /likes/block/:id - Unblock a user
router.delete('/block/:id', isAuthenticated, async (req, res) => {
    try {
        const blockerId = req.session.userId;
        const blockedId = parseInt(req.params.id);
        
        const result = await pool.query(
            `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING id`,
            [blockerId, blockedId]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'User was not blocked' });
        }
        
        res.json({ success: true, message: 'User unblocked' });
        
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ error: 'Error unblocking user' });
    }
});

module.exports = router;
