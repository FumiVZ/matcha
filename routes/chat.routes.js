const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get("/getMatched", async (req, res) => {
    try {
        const userId = req.session.userId;
        const result = await pool.query(
            `SELECT 
                CASE 
                    WHEN m.user1_id = $1 THEN m.user2_id 
                    ELSE m.user1_id 
                END as matched_user_id,
                u.username,
                u.first_name,
                u.name,
                matched_at,
                (SELECT file_path FROM user_photos WHERE user_id = u.id AND is_profile_photo = true LIMIT 1) as profile_photo
            FROM matches m
            JOIN users u ON u.id = CASE 
                WHEN m.user1_id = $1 THEN m.user2_id 
                ELSE m.user1_id 
            END
            WHERE m.user1_id = $1 OR m.user2_id = $1
            ORDER BY m.matched_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching matched users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/getMessages/:matchedUserId", async (req, res) => {
    try {
        const userId = req.session.userId;
        const matchedUserId = req.params.matchedUserId;
        
        const result = await pool.query(
            `SELECT sender_id, receiver_id, content as message, created_at as sent_at
            FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC`,
            [userId, matchedUserId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;