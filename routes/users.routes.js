const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const isAuthenticated = require('../middlewares/isAuthenticated');

const router = express.Router();

// HTML escape function to prevent XSS
const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// GET /users/browse - Browse all users page
router.get('/browse', isAuthenticated, async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'pages', 'browse-users.html'));
    } catch (error) {
        console.error('Error loading browse page:', error);
        res.status(500).send('Server error');
    }
});

// GET /users/api/list - Get list of users (excluding current user)
router.get('/api/list', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;

        // Fetch users with completed profiles, excluding current user
        const result = await pool.query(
            `SELECT u.id, u.first_name, u.name, u.gender, u.sexual_preference, u.biography,
                    u.location_city, u.location_country,
                    (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
             FROM users u
             WHERE u.id != $1 
               AND u.profile_complete = true 
               AND u.email_verified = true
             ORDER BY u.id DESC`,
            [currentUserId]
        );

        // Fetch tags for each user
        const users = await Promise.all(result.rows.map(async (user) => {
            const tagsResult = await pool.query(
                `SELECT t.name FROM tags t 
                 JOIN user_tags ut ON t.id = ut.tag_id 
                 WHERE ut.user_id = $1`,
                [user.id]
            );
            return {
                ...user,
                tags: tagsResult.rows.map(row => row.name)
            };
        }));

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// GET /users/profile/:id - View a specific user's profile page
router.get('/profile/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.session.userId;

        // Don't allow viewing your own profile through this route
        if (userId === currentUserId) {
            return res.redirect('/dashboard');
        }

        // Fetch user data
        const userResult = await pool.query(
            `SELECT id, first_name, name, gender, sexual_preference, biography,
                    location_city, location_country, popularity_score, is_online, last_online
             FROM users 
             WHERE id = $1 AND profile_complete = true AND email_verified = true`,
            [userId]
        );


        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const isOnline = userResult.rows[0].is_online || false;
        const lastSeen = userResult.rows[0].last_online ? new Date(userResult.rows[0].last_online).toISOString() : null;

        const user = userResult.rows[0];

        // Record profile view (upsert - insert or update timestamp)
        await pool.query(
            `INSERT INTO profile_views (viewer_id, viewed_id, viewed_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (viewer_id, viewed_id) 
             DO UPDATE SET viewed_at = NOW()`,
            [currentUserId, userId]
        );

        // Fetch profile photo
        const photoResult = await pool.query(
            `SELECT file_path FROM user_photos 
             WHERE user_id = $1 AND is_profile_photo = true 
             LIMIT 1`,
            [userId]
        );
        const profilePhoto = photoResult.rows[0]?.file_path || null;

        // Fetch all photos
        const allPhotosResult = await pool.query(
            `SELECT file_path, is_profile_photo FROM user_photos 
             WHERE user_id = $1 
             ORDER BY is_profile_photo DESC`,
            [userId]
        );
        const photos = allPhotosResult.rows;
        
        // Fetch tags
        const tagsResult = await pool.query(
            `SELECT t.name FROM tags t 
             JOIN user_tags ut ON t.id = ut.tag_id 
             WHERE ut.user_id = $1`,
            [userId]
        );
        const tags = tagsResult.rows.map(row => row.name);

        // Read template
        const templatePath = path.join(__dirname, '..', 'pages', 'user-profile.html');
        fs.readFile(templatePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error loading profile page');
            }

            const displayName = [user.first_name, user.name].filter(Boolean).join(' ') || `User #${user.id}`;
            const location = [user.location_city, user.location_country].filter(Boolean).join(', ') || '';

            const html = data
                .replace(/<%= userId %>/g, user.id)
                .replace(/<%= displayName %>/g, escapeHtml(displayName))
                .replace('<%= firstName %>', escapeHtml(user.first_name || ''))
                .replace('<%= lastName %>', escapeHtml(user.name || ''))
                .replace('<%= gender %>', escapeHtml(user.gender || ''))
                .replace('<%= sexualPreference %>', escapeHtml(user.sexual_preference || ''))
                .replace('<%= biography %>', escapeHtml(user.biography || ''))
                .replace('<%= location %>', escapeHtml(location))
                .replace('<%= popularityScore %>', user.popularity_score || 1000)
                .replace('<%= profilePhoto %>', profilePhoto ? `/uploads/photos/${escapeHtml(profilePhoto)}` : '')
                .replace('<%= photos %>', JSON.stringify(photos.map(p => `/uploads/photos/${p.file_path}`)))
                .replace('<%= tags %>', JSON.stringify(tags.map(tag => escapeHtml(tag))))
                .replace('<%= isOnline %>', isOnline ? 'true' : 'false')
                .replace('<%= lastSeen %>', lastSeen ? escapeHtml(lastSeen) : 'null');

            res.send(html);
        });
    } catch (error) {
        console.error('Error loading user profile:', error);
        res.status(500).send('Server error');
    }
});

// GET /users/api/viewers - Get list of users who viewed my profile
router.get('/api/viewers', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.session.userId;

        // Fetch users who viewed current user's profile, ordered by most recent
        // Use AT TIME ZONE to ensure proper timezone handling
        const result = await pool.query(
            `SELECT u.id, u.first_name, u.name, 
                    pv.viewed_at AT TIME ZONE 'UTC' as viewed_at,
                    (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
             FROM profile_views pv
             JOIN users u ON pv.viewer_id = u.id
             WHERE pv.viewed_id = $1
               AND u.profile_complete = true
               AND u.email_verified = true
             ORDER BY pv.viewed_at DESC
             LIMIT 20`,
            [currentUserId]
        );

        // Ensure timestamps are properly formatted as ISO strings
        const viewers = result.rows.map(row => ({
            ...row,
            viewed_at: row.viewed_at ? new Date(row.viewed_at).toISOString() : null
        }));

        res.json(viewers);
    } catch (error) {
        console.error('Error fetching profile viewers:', error);
        res.status(500).json({ error: 'Error fetching profile viewers' });
    }
});

// POST /users/api/heartbeat - Update user's online status
router.post('/api/heartbeat', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        await pool.query(
            `UPDATE users 
             SET is_online = true, last_online = NOW() 
             WHERE id = $1`,
            [userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating heartbeat:', error);
        res.status(500).json({ error: 'Error updating status' });
    }
});

module.exports = router;
