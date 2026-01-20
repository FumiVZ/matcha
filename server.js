// server.js
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const pool = require('./config/db');
const logger = require('./events/logger');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const notificationRoutes = require('./routes/notification.routes');
const usersRoutes = require('./routes/users.routes');
const likesRoutes = require('./routes/likes.routes');
const sessionConfig = require('./config/session');
const isAuthenticated = require('./middlewares/isAuthenticated');
const isProfileComplete = require('./middlewares/isProfileComplete');
const { initNotificationService } = require('./services/notification.service');

const app = express();
const PORT = 3000;
const server = http.createServer(app);

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionConfig);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);
app.use('/users', usersRoutes);
app.use('/likes', likesRoutes);

// Serve uploaded photos with security headers and authorization
app.get('/uploads/photos/:filename', isAuthenticated, async (req, res) => {
    const filename = req.params.filename;
    
    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).send('Invalid filename');
    }
    
    // Extract userId from filename (format: userId_timestamp_random.ext)
    const fileUserId = filename.split('_')[0];
    
    // Check if user owns this photo or has permission to view it
    // For now, allow users to view their own photos and photos of other users (for matching)
    // You can add more restrictive logic here based on your app's requirements
    try {
        const photoResult = await pool.query(
            'SELECT user_id FROM user_photos WHERE file_path = $1',
            [filename]
        );
        
        if (photoResult.rows.length === 0) {
            return res.status(404).send('Photo not found');
        }
        
        // Security headers to prevent MIME sniffing and XSS (only for images)
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'private, max-age=3600');
        
        const filePath = path.join(__dirname, 'uploads', 'photos', filename);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving photo:', error);
        res.status(500).send('Server error');
    }
});


// Middleware to log each page visited
app.use((req, res, next) => {
    logger.emit('pageVisited', req.path);
    next();
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'front/dist')));

// Handle React routing - this must be LAST, after all API routes
app.get('*', (req, res) => {
    // Check if the dist folder has an index.html (production mode)
    const indexPath = path.join(__dirname, 'front/dist', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        // Production: serve the built React app
        if (!req.path.startsWith('/auth') && !req.path.startsWith('/profile') && !req.path.startsWith('/uploads')) {
            return res.sendFile(indexPath);
        }
    }
    
    // If no built app exists or API route, return 404
    res.status(404).send('Not found. In development mode, run the React dev server with: npm run dev:front');
});
// Routes to HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'contact.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'auth.html'));
});

app.get('/matches', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'matches.html'));
});


const pool = require('./config/db');

app.get('/dashboard', isProfileComplete, async (req, res) => {
    try {
        // Fetch user profile data including location and popularity score
        const userResult = await pool.query(
            `SELECT id, first_name, name, gender, sexual_preference, biography,
                    location_city, location_country, popularity_score 
             FROM users WHERE id = $1`,
            [req.session.userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch user's profile photo
        const photoResult = await pool.query(
            `SELECT file_path FROM user_photos 
             WHERE user_id = $1 AND is_profile_photo = true 
             LIMIT 1`,
            [req.session.userId]
        );
        const profilePhoto = photoResult.rows[0]?.file_path || null;

        // Fetch user's tags
        const tagsResult = await pool.query(
            `SELECT t.name FROM tags t 
             JOIN user_tags ut ON t.id = ut.tag_id 
             WHERE ut.user_id = $1`,
            [req.session.userId]
        );
        const tags = tagsResult.rows.map(row => row.name);

        const dashboardPath = path.join(__dirname, 'pages', 'dashboard.html');
        fs.readFile(dashboardPath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error loading dashboard');
            }
            
            // Escape all user-provided data to prevent XSS
            const html = data
                .replace('<%= userId %>', escapeHtml(user.id))
                .replace('<%= firstName %>', escapeHtml(user.first_name || ''))
                .replace('<%= name %>', escapeHtml(user.name || ''))
                .replace('<%= email %>', escapeHtml(user.email))
                .replace('<%= gender %>', escapeHtml(user.gender || ''))
                .replace('<%= sexualPreference %>', escapeHtml(user.sexual_preference || ''))
                .replace('<%= biography %>', escapeHtml(user.biography || ''))
                .replace('<%= profilePhoto %>', profilePhoto ? `/uploads/photos/${escapeHtml(profilePhoto)}` : '')
                .replace('<%= tags %>', JSON.stringify(tags.map(tag => escapeHtml(tag))))
                .replace('<%= locationCity %>', escapeHtml(user.location_city || ''))
                .replace('<%= locationCountry %>', escapeHtml(user.location_country || ''))
                .replace('<%= popularityScore %>', user.popularity_score || 1000);
            
            res.send(html);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Server error');
    }
    
    // If no built app exists or API route, return 404
    res.status(404).send('Not found. In development mode, run the React dev server with: npm run dev:front');
});

const wss = initNotificationService(server, sessionConfig.store);

// 404 - page not found
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});
