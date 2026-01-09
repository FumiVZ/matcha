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
const pool = require('./config/db');
const logger = require('./events/logger');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const sessionConfig = require('./config/session');
const isAuthenticated = require('./middlewares/isAuthenticated');
const isProfileComplete = require('./middlewares/isProfileComplete');

const app = express();
const PORT = 3000;

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
        
        // Security headers to prevent MIME sniffing and XSS
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Content-Security-Policy', "default-src 'none'");
        res.set('Cache-Control', 'private, max-age=3600');
        
        const filePath = path.join(__dirname, 'uploads', 'photos', filename);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving photo:', error);
        res.status(500).send('Server error');
    }
});


// Middleware pour logger chaque page visitée
app.use((req, res, next) => {
    logger.emit('pageVisited', req.path);
    next();
});

// Serve React App
app.use(express.static(path.join(__dirname, 'front/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'front/dist', 'index.html'));
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
