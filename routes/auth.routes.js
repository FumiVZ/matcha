const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        req.session.email = user.email;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid email or password');
    }
});

// POST /auth/register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
            [email, hashedPassword]
        );

        req.session.userId = result.rows[0].id;
        req.session.email = email;
        
        // Redirect to profile setup instead of dashboard
        res.redirect('/profile/setup');
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).send('Email already registered');
        }
        console.error('Registration error:', error);
        res.status(500).send('Error during registration');
    }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (userId) {
            await pool.query(
                'UPDATE users SET last_logout = NOW() WHERE id = $1',
                [userId]
            );
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Error during logout');
            }
            
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).send('Error during logout');
    }
});

module.exports = router;
