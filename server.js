// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('./events/logger');
const authRoutes = require('./routes/auth.routes');
const sessionConfig = require('./config/session');
const isAuthenticated = require('./middlewares/isAuthenticated');

const app = express();
const PORT = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionConfig);
app.use('/auth', authRoutes);


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


app.get('/dashboard', isAuthenticated, (req, res) => {
    const dashboardPath = path.join(__dirname, 'pages', 'dashboard.html');
    fs.readFile(dashboardPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Erreur lors du chargement du dashboard');
        }
        // Remplacer les variables par les vraies valeurs
        const html = data
            .replace('<%= userId %>', req.session.userId)
            .replace('<%= email %>', req.session.email);
        res.send(html);
    });
});


// 404 - page non trouvée
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
