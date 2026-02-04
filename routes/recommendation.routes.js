const express = require('express');
const pool = require('../config/db');
const isAuthenticated = require('../middlewares/isAuthenticated');

const router = express.Router();

/*
recommendation score (x/100) weights:
    proximity: 0.60
    similarity in tags: 0.30
    popularity score difference: 0.10
*/
const haversineFilter = (fn) => async (coordinates, radius) => {
    const candidates = await fn(coordinates, radius);
    const { latitude, longitude } = coordinates;

    return candidates.map(user => {
        if (!user.location_latitude || !user.location_longitude) return null;

        const R = 6371; // Earth's radius in km
        const dLat = (user.location_latitude - latitude) * (Math.PI / 180);
        const dLon = (user.location_longitude - longitude) * (Math.PI / 180);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(latitude * (Math.PI / 180)) * 
            Math.cos(user.location_latitude * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km

        return { ...user, distance: Math.round(distance) };
    })
    .filter(user => user !== null && user.distance <= radius);
};

const radiusFilteredList = haversineFilter(async (coordinates, radius) => {
    const { latitude, longitude } = coordinates;
    const rad = Number(radius);
    const R = 6371; // Earth's radius in kilometers
    
    // Bounding box calculation for SQL optimization
    const dLat = (rad / R) * (180 / Math.PI);
    const dLon = (rad / R) * (180 / Math.PI) / Math.cos(latitude * (Math.PI / 180));
    
    const minLat = latitude - dLat;
    const maxLat = latitude + dLat;
    const minLon = longitude - dLon;
    const maxLon = longitude + dLon;

    const query = `
        SELECT id, location_latitude, location_longitude
        FROM users
        WHERE location_latitude BETWEEN $1 AND $2
        AND location_longitude BETWEEN $3 AND $4
    `; 

    const result = await pool.query(query, [minLat, maxLat, minLon, maxLon]);
    return result.rows;
});

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const {
            minAge = 0,
            maxAge = 1000,
            minScore = 0,
            maxScore = 10000,
            gender,
            tags,
            radius
        } = req.query;

        // Ensure parameters are numbers
        const pMinAge = parseInt(minAge);
        const pMaxAge = parseInt(maxAge);
        const pMinScore = parseInt(minScore);
        const pMaxScore = parseInt(maxScore);
        const pRadius = radius ? parseInt(radius) : null;

        let query = `
            SELECT 
                u.id, 
                u.username, 
                u.gender, 
                u.sexual_preference, 
                u.biography, 
                u.birthdate, 
                u.popularity_score as score,
                u.location_city,
                u.location_latitude,
                u.location_longitude,
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

        // Get current user location
        const locResult = await pool.query(
            `SELECT location_latitude, location_longitude FROM users WHERE id = $1`,
            [req.session.userId]
        );
        const currentUser = locResult.rows[0];
        const userLat = currentUser?.location_latitude ? Number(currentUser.location_latitude) : null;
        const userLon = currentUser?.location_longitude ? Number(currentUser.location_longitude) : null;
        let distMap = new Map();

        // Filter by Radius
        if (pRadius) {
            if (userLat && userLon) {
                const resultsInRadius = await radiusFilteredList({
                    latitude: userLat,
                    longitude: userLon
                }, pRadius);

                if (resultsInRadius.length === 0) {
                    return res.json([]); // No users in radius, return empty array immediately
                }
                
                resultsInRadius.forEach(u => distMap.set(u.id, u.distance));
                const ids = resultsInRadius.map(u => u.id);

                paramCount++;
                query += ` AND u.id = ANY($${paramCount})`;
                queryParams.push(ids);
            }
        }

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
            // Add distance
            if (distMap.has(user.id)) {
                user.distance = distMap.get(user.id);
            } else if (userLat && userLon && user.location_latitude && user.location_longitude) {
                const R = 6371; 
                const dLat = (user.location_latitude - userLat) * (Math.PI / 180);
                const dLon = (user.location_longitude - userLon) * (Math.PI / 180);
                const a = 
                   Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(userLat * (Math.PI / 180)) * 
                   Math.cos(user.location_latitude * (Math.PI / 180)) * 
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                user.distance = Math.round(R * c);
            } else {
                user.distance = null;
            }

            const tagsResult = await pool.query(`
                SELECT t.name 
                FROM tags t
                JOIN user_tags ut ON t.id = ut.tag_id
                WHERE ut.user_id = $1
            `, [user.id]);
            user.tags = tagsResult.rows.map(row => row.name);
        }
        for (let user of users) {
            user.recommendationScore = 0;
            
            // Proximity score (60%)
            if (user.distance !== null && pRadius) {
                const proximityScore = Math.max(0, (pRadius - user.distance) / pRadius);
                user.recommendationScore += proximityScore * 60;
            }
            // Similarity in tags score (30%)
            if (tags && tags.length > 0) {
                const userTags = new Set(user.tags);
                const searchTags = new Set(Array.isArray(tags) ? tags : [tags]);
                const commonTagsCount = [...searchTags].filter(tag => userTags.has(tag)).length;
                const tagSimilarityScore = commonTagsCount / searchTags.size;
                user.recommendationScore += tagSimilarityScore * 30;
            }
            // Popularity score difference (10%)
            const currentUserScoreResult = await pool.query(
                `SELECT popularity_score FROM users WHERE id = $1`,
                [req.session.userId]
            );
            const currentUserScore = currentUserScoreResult.rows[0]?.popularity_score || 0;
            const scoreDiff = Math.abs(currentUserScore - user.score);
            const maxScoreDiff = 10000;
            const popularityScore = Math.max(0, (maxScoreDiff - scoreDiff) / maxScoreDiff);
            user.recommendationScore += popularityScore * 10;
        }
        res.json(users);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
});

module.exports = router;