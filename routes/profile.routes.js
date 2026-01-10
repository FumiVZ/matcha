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
    const { 
        first_name, name, gender, sexual_preference, biography, tags, profile_photo_index,
        location_city, location_country, location_latitude, location_longitude, 
        location_consent, location_manual 
    } = req.body;
    const userId = req.session.userId;

    try {
        // Validate required fields
        if (!gender || !sexual_preference || !biography) {
            return res.status(400).send('Please fill in all required fields');
        }
        
        // Validate location
        if (!location_city || !location_country) {
            return res.status(400).send('Please provide your location');
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

        // Update user profile with location data
        await pool.query(
            `UPDATE users 
             SET first_name = $1, name = $2, gender = $3, sexual_preference = $4, biography = $5, 
                 location_city = $6, location_country = $7, 
                 location_latitude = $8, location_longitude = $9,
                 location_consent = $10, location_manual = $11,
                 profile_complete = TRUE 
             WHERE id = $12`,
            [
                first_name, name, gender, sexual_preference, biography,
                location_city, location_country,
                location_latitude || null, location_longitude || null,
                location_consent === 'true', location_manual === 'true',
                userId
            ]
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

// GET /api/reverse-geocode - Convert coordinates to city/country (RGPD compliant)
router.get('/api/reverse-geocode', isAuthenticated, async (req, res) => {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    try {
        // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key required)
        // Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Matcha-App/1.0' // Required by Nominatim
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }
        
        const data = await response.json();
        
        // Extract city and country from response
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.municipality || address.county || '';
        const country = address.country || '';
        
        res.json({ city, country });
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({ error: 'Could not determine location' });
    }
});

// GET /api/ip-geolocation - Server-side IP-based location detection (RGPD compliant)
// The user's IP stays on our server, we only return city/country to the client
router.get('/api/ip-geolocation', isAuthenticated, async (req, res) => {
    try {
        // Get client IP from request
        // Check X-Forwarded-For for proxied requests, fallback to direct IP
        const forwarded = req.headers['x-forwarded-for'];
        let clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
        
        // Handle IPv6 localhost
        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
            clientIp = ''; // Will trigger ip-api to use the server's public IP
        }
        
        // Remove IPv6 prefix if present
        if (clientIp && clientIp.startsWith('::ffff:')) {
            clientIp = clientIp.substring(7);
        }
        
        // Use ip-api.com for IP geolocation (free for non-commercial use, 45 req/min)
        // RGPD note: IP is processed server-side, only city/country returned to client
        const apiUrl = clientIp 
            ? `http://ip-api.com/json/${clientIp}?fields=status,message,city,country,lat,lon`
            : `http://ip-api.com/json/?fields=status,message,city,country,lat,lon`;
            
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'success' && data.city && data.country) {
            // Only return location data, not the IP itself (RGPD compliant)
            res.json({
                city: data.city,
                country: data.country,
                latitude: data.lat,
                longitude: data.lon
            });
        } else {
            console.error('IP geolocation failed:', data.message || 'Unknown error');
            res.status(404).json({ error: 'Could not determine location from IP' });
        }
    } catch (error) {
        console.error('IP geolocation error:', error);
        res.status(500).json({ error: 'Location service unavailable' });
    }
});

// GET /profile/edit - Display profile edit form
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        // Fetch user data including location
        const userResult = await pool.query(
            `SELECT first_name, name, gender, sexual_preference, biography,
                    location_city, location_country 
             FROM users WHERE id = $1`,
            [req.session.userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch user's current tags
        const userTagsResult = await pool.query(
            `SELECT tag_id FROM user_tags WHERE user_id = $1`,
            [req.session.userId]
        );
        const userTagIds = userTagsResult.rows.map(row => row.tag_id);

        // Get all available tags
        const tagsResult = await pool.query('SELECT id, name FROM tags ORDER BY name');
        const tags = tagsResult.rows;

        // Read the profile edit HTML template
        const templatePath = path.join(__dirname, '..', 'pages', 'profile-edit.html');
        fs.readFile(templatePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error loading profile edit page');
            }

            // Generate tags checkboxes HTML
            const tagsHtml = tags.map(tag => 
                `<label class="tag-label">
                    <input type="checkbox" name="tags" value="${tag.id}">
                    <span class="tag-text">${tag.name}</span>
                </label>`
            ).join('\n');

            // HTML escape function
            const escapeHtml = (str) => {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };

            // Replace template variables
            const html = data
                .replace('<%= firstName %>', escapeHtml(user.first_name || ''))
                .replace('<%= name %>', escapeHtml(user.name || ''))
                .replace('<%= gender %>', escapeHtml(user.gender || ''))
                .replace('<%= sexualPreference %>', escapeHtml(user.sexual_preference || ''))
                .replace('<%= biography %>', escapeHtml(user.biography || ''))
                .replace('<%= tagsHtml %>', tagsHtml)
                .replace('<%= userTagIds %>', JSON.stringify(userTagIds))
                .replace(/<%= locationCity %>/g, escapeHtml(user.location_city || ''))
                .replace(/<%= locationCountry %>/g, escapeHtml(user.location_country || ''));

            res.send(html);
        });
    } catch (error) {
        console.error('Error loading profile edit:', error);
        res.status(500).send('Server error');
    }
});

// PUT /profile/update - Update profile data
router.put('/update', isAuthenticated, async (req, res) => {
    const { first_name, name, gender, sexual_preference, biography, tags, location_city, location_country } = req.body;
    const userId = req.session.userId;

    try {
        // Validate required fields
        if (!gender || !sexual_preference || !biography) {
            return res.status(400).send('Please fill in all required fields');
        }

        // Validate tags
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).send('Please select at least one interest tag');
        }
        
        // Validate location
        if (!location_city || !location_country) {
            return res.status(400).send('Please provide your location');
        }

        // Update user profile including location
        await pool.query(
            `UPDATE users 
             SET first_name = $1, name = $2, gender = $3, sexual_preference = $4, biography = $5,
                 location_city = $6, location_country = $7 
             WHERE id = $8`,
            [first_name || null, name || null, gender, sexual_preference, biography, location_city, location_country, userId]
        );

        // Update tags
        // Clear existing user tags
        await pool.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);
        
        // Insert new tags
        for (const tagId of tags) {
            await pool.query(
                'INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)',
                [userId, tagId]
            );
        }

        res.status(200).send('Profile updated successfully');

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Error updating profile');
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
