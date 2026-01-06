// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('./events/logger');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const sessionConfig = require('./config/session');
const isAuthenticated = require('./middlewares/isAuthenticated');
const isProfileComplete = require('./middlewares/isProfileComplete');

const app = express();
const PORT = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionConfig);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

// Serve uploaded photos (protected - requires authentication)
app.use('/uploads', isAuthenticated, express.static(path.join(__dirname, 'uploads')));


// Middleware pour logger chaque page visitée
app.use((req, res, next) => {
    logger.emit('pageVisited', req.path);
    next();
});

// Routes vers les pages HTML
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


const pool = require('./config/db');

app.get('/dashboard', isProfileComplete, async (req, res) => {
    try {
        // Fetch user profile data
        const userResult = await pool.query(
            `SELECT id, email, gender, sexual_preference, biography 
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
                return res.status(500).send('Erreur lors du chargement du dashboard');
            }
            
            const html = data
                .replace('<%= userId %>', user.id)
                .replace('<%= email %>', user.email)
                .replace('<%= gender %>', user.gender || '')
                .replace('<%= sexualPreference %>', user.sexual_preference || '')
                .replace('<%= biography %>', user.biography || '')
                .replace('<%= profilePhoto %>', profilePhoto ? `/uploads/photos/${profilePhoto}` : '')
                .replace('<%= tags %>', JSON.stringify(tags));
            
            res.send(html);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Server error');
    }
});


// 404 - page non trouvée
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
