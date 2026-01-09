const pool = require('../config/db');

const predefinedTags = [
    'Napping',
    'Sunbathing',
    'Chasing lasers',
    'Playing with strings',
    'Climbing furniture',
    'Bird watching',
    'Window gazing',
    'Box exploring',
    'Cuddling',
    'Being brushed',
    'Hunting toys',
    'Night zoomies',
    'Eating treats',
    'Watching humans',
    'Knocking things off tables',
    'Sleeping on keyboards',
    'Scratching posts',
    'Hiding in small spaces',
    'Exploring new places',
    'Listening to rain'
];

(async () => {
    try {
        // Drop tables in correct order (respect foreign key constraints)
        await pool.query('DROP TABLE IF EXISTS user_tags;');
        console.log('Table user_tags dropped!');
        
        await pool.query('DROP TABLE IF EXISTS user_photos;');
        console.log('Table user_photos dropped!');
        
        await pool.query('DROP TABLE IF EXISTS tags;');
        console.log('Table tags dropped!');
        
        await pool.query('DROP TABLE IF EXISTS users;');
        console.log('Table users dropped!');
        
        // Create users table with profile fields
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100),
                name VARCHAR(100),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                gender VARCHAR(20),
                sexual_preference VARCHAR(20),
                biography TEXT,
                profile_complete BOOLEAN DEFAULT FALSE,
                last_logout TIMESTAMP,
                score INT DEFAULT 1000,
                email_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(64),
                verification_token_expires TIMESTAMP
            );
        `);
        console.log('Table users created with profile fields!');
        
        // Create tags table for reusable interest tags
        await pool.query(`
            CREATE TABLE tags (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL
            );
        `);
        console.log('Table tags created!');
        
        // Seed predefined tags
        for (const tag of predefinedTags) {
            await pool.query(
                'INSERT INTO tags (name) VALUES ($1)',
                [tag]
            );
        }
        console.log(`Seeded ${predefinedTags.length} predefined tags!`);
        
        // Create user_tags junction table (many-to-many relationship)
        await pool.query(`
            CREATE TABLE user_tags (
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, tag_id)
            );
        `);
        console.log('Table user_tags created!');
        
        // Create user_photos table
        await pool.query(`
            CREATE TABLE user_photos (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                file_path VARCHAR(255) NOT NULL,
                is_profile_photo BOOLEAN DEFAULT FALSE,
                uploaded_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Table user_photos created!');
        
        console.log('\nDatabase initialization complete!');
        
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        pool.end();
    }
})();
