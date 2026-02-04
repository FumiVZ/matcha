const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/mailer');
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
// Development flag to skip email verification
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
        // Check if email is verified (skip in development if flag is set)
        if (!user.email_verified && !SKIP_EMAIL_VERIFICATION) {
            return res.status(403).send('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        
        req.session.userId = user.id;
        req.session.email = user.email;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid email or password');
    }
});

// POST /auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
        // If skipping email verification, auto-verify the user
        if (SKIP_EMAIL_VERIFICATION) {
            const result = await pool.query(
                `INSERT INTO users (username, email, password, email_verified) 
                 VALUES ($1, $2, $3, TRUE) RETURNING id`,
                [username, email, hashedPassword]
            );
            
            console.log('[DEV] Email verification skipped for:', email);
            
            // Auto-login the user
            req.session.userId = result.rows[0].id;
            req.session.email = email;
            return res.redirect('/auth/verification-success');
        }

        await pool.query(
            `INSERT INTO users (username, email, password, verification_token, verification_token_expires) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [username, email, hashedPassword, verificationToken, tokenExpires]
        );

        // Send verification email
        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Delete the user if email fails to send
            await pool.query('DELETE FROM users WHERE email = $1', [email]);
            return res.status(500).send('Failed to send verification email. Please try again.');
        }
        
        // Redirect to verification pending page
        res.redirect('/auth/verify-email-sent');
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

// GET /auth/verify/:token - Email verification endpoint
router.get('/verify/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT id, email FROM users 
             WHERE verification_token = $1 
             AND verification_token_expires > NOW()
             AND email_verified = FALSE`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).send('Invalid or expired verification link. Please register again or request a new verification email.');
        }
        
        const user = result.rows[0];
        
        // Mark email as verified and clear token
        await pool.query(
            `UPDATE users 
             SET email_verified = TRUE, 
                 verification_token = NULL, 
                 verification_token_expires = NULL 
             WHERE id = $1`,
            [user.id]
        );
        
        // Set session and redirect to profile setup
        req.session.userId = user.id;
        req.session.email = user.email;
        
        res.redirect('/auth/verification-success');
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).send('Error during email verification');
    }
});

// GET /auth/verify-email-sent - Show "check your email" page
router.get('/verify-email-sent', (req, res) => {
    res.sendFile('verify-email.html', { root: './pages' });
});

// GET /auth/verification-success - Show success page
router.get('/verification-success', (req, res) => {
    res.sendFile('verification-success.html', { root: './pages' });
});

// POST /auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id, email_verified FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).send('Email not found');
        }
        
        const user = result.rows[0];
        
        if (user.email_verified) {
            return res.status(400).send('Email is already verified');
        }
        
        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        await pool.query(
            `UPDATE users 
             SET verification_token = $1, verification_token_expires = $2 
             WHERE id = $3`,
            [verificationToken, tokenExpires, user.id]
        );
        
        await sendVerificationEmail(email, verificationToken);
        
        res.send('Verification email sent! Please check your inbox.');
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).send('Failed to resend verification email');
    }
});

// GET /auth/forgot-password - Show forgot password page
router.get('/forgot-password', (req, res) => {
    res.sendFile('forgot-password.html', { root: './pages' });
});

// POST /auth/forgot-password - Send password reset email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        // Always show success message to prevent email enumeration
        if (result.rows.length === 0) {
            return res.send('If this email exists, a password reset link has been sent.');
        }
        
        const user = result.rows[0];
        
        // Generate reset token (expires in 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await pool.query(
            `UPDATE users 
             SET reset_token = $1, reset_token_expires = $2 
             WHERE id = $3`,
            [resetToken, tokenExpires, user.id]
        );
        
        await sendPasswordResetEmail(email, resetToken);
        
        res.send('If this email exists, a password reset link has been sent.');
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).send('Failed to process password reset request');
    }
});

// GET /auth/reset-password/:token - Show reset password form
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT id FROM users 
             WHERE reset_token = $1 
             AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).send('Invalid or expired reset link. Please request a new password reset.');
        }
        
        res.sendFile('reset-password.html', { root: './pages' });
    } catch (error) {
        console.error('Reset password page error:', error);
        res.status(500).send('Error loading reset password page');
    }
});

// POST /auth/reset-password/:token - Process password reset
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
        return res.status(400).send('Password must be at least 6 characters');
    }
    
    try {
        const result = await pool.query(
            `SELECT id FROM users 
             WHERE reset_token = $1 
             AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).send('Invalid or expired reset link. Please request a new password reset.');
        }
        
        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password and clear reset token
        await pool.query(
            `UPDATE users 
             SET password = $1, reset_token = NULL, reset_token_expires = NULL 
             WHERE id = $2`,
            [hashedPassword, user.id]
        );
        
        res.redirect('/auth/password-reset-success');
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).send('Error resetting password');
    }
});

// GET /auth/password-reset-success - Show success page
router.get('/password-reset-success', (req, res) => {
    res.sendFile('password-reset-success.html', { root: './pages' });
});

// GET /auth/status - Check authentication status
router.get('/status', async (req, res) => {
    if (!req.session.userId) {
        return res.json({ authenticated: false });
    }
    
    try {
        const result = await pool.query(
            'SELECT first_name, email, profile_complete FROM users WHERE id = $1',
            [req.session.userId]
        );
        
        if (result.rows.length === 0) {
            return res.json({ authenticated: false });
        }
        
        const user = result.rows[0];
        res.json({
            authenticated: true,
            firstName: user.first_name,
            email: user.email,
            profileComplete: user.profile_complete
        });
    } catch (error) {
        console.error('Auth status error:', error);
        res.json({ authenticated: false });
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
