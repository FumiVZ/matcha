const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const FileType = require('file-type');
const pool = require('../config/db');
const isAuthenticated = require('../middlewares/isAuthenticated');

const router = express.Router();

// Allowed file extensions and MIME types
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename) => {
    // Extract only the base filename (no path components)
    const baseName = path.basename(filename);
    // Remove any characters that could be dangerous
    return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// Generate secure random filename
const generateSecureFilename = (userId, originalname) => {
    const ext = path.extname(originalname).toLowerCase();
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `${userId}_${Date.now()}_${randomPart}${ext}`;
};

// Multer configuration for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'photos');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate secure unique filename with random component
        const uniqueName = generateSecureFilename(req.session.userId, file.originalname);
        cb(null, uniqueName);
    }
});

// File filter to validate extension and MIME type
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error('Only .jpg, .jpeg, and .png extensions are allowed'), false);
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// GET /profile/setup - Display profile setup form
router.get('/setup', isAuthenticated, async (req, res) => {
    try {
        // Check if profile is already complete
        const userResult = await pool.query(
            'SELECT profile_complete FROM users WHERE id = $1',
            [req.session.userId]
        );

        if (userResult.rows[0]?.profile_complete) {
            return res.redirect('/dashboard');
        }

        // Get all available tags
        const tagsResult = await pool.query('SELECT id, name FROM tags ORDER BY name');
        const tags = tagsResult.rows;

        // Read the profile setup HTML template
        const templatePath = path.join(__dirname, '..', 'pages', 'profile-setup.html');
        fs.readFile(templatePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error loading profile setup page');
            }

            // Generate tags checkboxes HTML
            const tagsHtml = tags.map(tag => 
                `<label class="tag-label">
                    <input type="checkbox" name="tags" value="${tag.id}">
                    <span class="tag-text">${tag.name}</span>
                </label>`
            ).join('\n');

            // Replace template variables
            const html = data
                .replace('<%= userId %>', req.session.userId)
                .replace('<%= email %>', req.session.email)
                .replace('<%= tagsHtml %>', tagsHtml);

            res.send(html);
        });
    } catch (error) {
        console.error('Error loading profile setup:', error);
        res.status(500).send('Server error');
    }
});

// POST /profile/setup - Submit profile data
router.post('/setup', isAuthenticated, upload.array('photos', 5), async (req, res) => {
    const { gender, sexual_preference, biography, tags, profile_photo_index } = req.body;
    const userId = req.session.userId;

    try {
        // Validate required fields
        if (!gender || !sexual_preference || !biography) {
            return res.status(400).send('Please fill in all required fields');
        }

        // Validate required photos (at least one)
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('Please upload at least one photo');
        }

        // Validate file contents using magic bytes
        for (const file of req.files) {
            const fileType = await FileType.fromFile(file.path);
            if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
                // Delete all uploaded files if validation fails
                for (const f of req.files) {
                    fs.unlink(f.path, () => {});
                }
                return res.status(400).send('Invalid file content. Only real JPEG and PNG images are allowed.');
            }
        }

        // Validate required tags (at least one)
        if (!tags || (Array.isArray(tags) && tags.length === 0)) {
            return res.status(400).send('Please select at least one interest tag');
        }

        // Update user profile
        await pool.query(
            `UPDATE users 
             SET gender = $1, sexual_preference = $2, biography = $3, profile_complete = TRUE 
             WHERE id = $4`,
            [gender, sexual_preference, biography, userId]
        );

        // Handle tags (can be a single value or array)
        if (tags) {
            const tagIds = Array.isArray(tags) ? tags : [tags];
            
            // Clear existing user tags
            await pool.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);
            
            // Insert new tags
            for (const tagId of tagIds) {
                await pool.query(
                    'INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)',
                    [userId, tagId]
                );
            }
        }

        // Handle photo uploads
        if (req.files && req.files.length > 0) {
            const profilePhotoIdx = parseInt(profile_photo_index) || 0;

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const isProfilePhoto = i === profilePhotoIdx;

                await pool.query(
                    `INSERT INTO user_photos (user_id, file_path, is_profile_photo) 
                     VALUES ($1, $2, $3)`,
                    [userId, file.filename, isProfilePhoto]
                );
            }
        }

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error saving profile:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        
        res.status(500).send('Error saving profile');
    }
});

// GET /api/tags - Get all available tags
router.get('/api/tags', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM tags ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Error fetching tags' });
    }
});

// GET /me - Get current user profile
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const userResult = await pool.query(
            `SELECT id, email, gender, sexual_preference, biography 
             FROM users WHERE id = $1`,
            [req.session.userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const photoResult = await pool.query(
            `SELECT file_path FROM user_photos 
             WHERE user_id = $1 AND is_profile_photo = true 
             LIMIT 1`,
            [req.session.userId]
        );
        const profilePhoto = photoResult.rows[0]?.file_path || null;

        const tagsResult = await pool.query(
            `SELECT t.name FROM tags t 
             JOIN user_tags ut ON t.id = ut.tag_id 
             WHERE ut.user_id = $1`,
            [req.session.userId]
        );
        const tags = tagsResult.rows.map(row => row.name);

        res.json({
            user,
            profilePhoto: profilePhoto ? `/uploads/photos/${profilePhoto}` : null,
            tags
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('File too large. Maximum size is 5MB.');
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).send('Too many files. Maximum is 5 photos.');
        }
    }
    if (error.message === 'Only JPEG and PNG images are allowed') {
        return res.status(400).send(error.message);
    }
    next(error);
});

module.exports = router;
