const express = require('express');
const pool = require('../config/db');
const isAuthenticated = require('../middlewares/isAuthenticated');

const router = express.Router();

// location in db
/*
                location_city VARCHAR(100),
                location_country VARCHAR(100),
                location_latitude DECIMAL(10, 8),
                location_longitude DECIMAL(11, 8),
*/
const calculateRadius = (coordinates, radius) => {
    const { latitude, longitude } = coordinates;
    const R = 6371; // Earth's radius in kilometers
    const query = `
        SELECT

        ` // preselect users within a radius to then filter with haversine

}

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const {
            minAge = 0,
            maxAge = 1000,
            minScore = 0,
            maxScore = 10000,
            gender,
            tags
        } = req.query;

        // Ensure parameters are numbers
        const pMinAge = parseInt(minAge);
        const pMaxAge = parseInt(maxAge);
        const pMinScore = parseInt(minScore);
        const pMaxScore = parseInt(maxScore);

        let query = `
            SELECT 
                u.id, 
                u.email, 
                u.gender, 
                u.sexual_preference, 
                u.biography, 
                u.birthdate, 
                u.score,
                EXTRACT(YEAR FROM AGE(u.birthdate)) as age,
                (
                    SELECT file_path 
                    FROM user_photos 
                    WHERE user_id = u.id AND is_profile_photo = TRUE 
                    LIMIT 1
                ) as profile_photo
            FROM users u
            WHERE 
                u.profile_complete = TRUE
                AND u.id != $1
                AND EXTRACT(YEAR FROM AGE(u.birthdate)) BETWEEN $2 AND $3
                AND u.score BETWEEN $4 AND $5
        `;

        const queryParams = [req.session.userId, pMinAge, pMaxAge, pMinScore, pMaxScore];
        let paramCount = 5;

        // Filter by gender if provided
        if (gender) {
            paramCount++;
            query += ` AND u.gender = $${paramCount}`;
            queryParams.push(gender);
        }

        // Filter by tags if provided
        if (tags) {
            const tagList = Array.isArray(tags) ? tags : [tags];
            if (tagList.length > 0) {
                
                paramCount++;
                query += ` AND EXISTS (
                    SELECT 1 
                    FROM user_tags ut 
                    JOIN tags t ON ut.tag_id = t.id 
                    WHERE ut.user_id = u.id 
                    AND t.name = ANY($${paramCount})
                )`;
                queryParams.push(tagList);
            }
        }

        const result = await pool.query(query, queryParams);
        
        const users = result.rows;
        
        for (let user of users) {
            const tagsResult = await pool.query(`
                SELECT t.name 
                FROM tags t
                JOIN user_tags ut ON t.id = ut.tag_id
                WHERE ut.user_id = $1
            `, [user.id]);
            user.tags = tagsResult.rows.map(row => row.name);
        }

        res.json(users);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
});

module.exports = router;
