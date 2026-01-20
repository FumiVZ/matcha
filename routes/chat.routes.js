const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get("/getMatched", async (req, res) => {
    try {
        const userId = req.session.userId;
        const [rows] = await pool.execute(
            "SELECT sender_id, message, timestamp FROM messages WHERE receiver_id = ? ORDER BY timestamp DESC",
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;