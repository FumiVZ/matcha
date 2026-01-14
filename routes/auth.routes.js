const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const router = express.Router();

// GET /auth/session - Check if user is logged in
router.get('/session', async (req, res) => {
    if (req.session.userId) {
        try {
            const result = await pool.query(
                'SELECT id, email, username, first_name, last_name, profile_complete FROM users WHERE id = $1',
                [req.session.userId]
            );
            
            if (result.rows.length > 0) {
                return res.json({ 
                    authenticated: true, 
                    user: result.rows[0] 
                });
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }
    res.json({ authenticated: false });
});

// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.email = user.email;
            
            // Check if request expects JSON
            if (req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json')) {
                return res.json({ 
                    success: true, 
                    user: { 
                        id: user.id, 
                        email: user.email,
                        profile_complete: user.profile_complete 
                    },
                    redirect: user.profile_complete ? '/dashboard' : '/profile/setup'
                });
            }
            res.redirect('/dashboard');
        } else {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            res.send('Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.status(500).send('Server error');
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
        
        // Check if request expects JSON
        if (req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json')) {
            return res.json({ 
                success: true, 
                user: { id: result.rows[0].id, email },
                redirect: '/profile/setup'
            });
        }
        
        // Redirect to profile setup instead of dashboard
        res.redirect('/profile/setup');
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }
            return res.status(400).send('Email already registered');
        }
        console.error('Registration error:', error);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Error during registration' });
        }
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
                if (req.headers.accept?.includes('application/json')) {
                    return res.status(500).json({ success: false, message: 'Error during logout' });
                }
                return res.status(500).send('Error during logout');
            }
            
            res.clearCookie('connect.sid');
            
            if (req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, redirect: '/' });
            }
            res.redirect('/');
        });
    } catch (error) {
        console.error('Logout error:', error);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Error during logout' });
        }
        res.status(500).send('Error during logout');
    }
});

module.exports = router;
