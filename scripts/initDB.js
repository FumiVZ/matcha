const pool = require('../config/db');
const bcrypt = require('bcrypt');

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
        await pool.query('DROP TABLE IF EXISTS messages;');
        console.log('Table messages dropped!');

        await pool.query('DROP TABLE IF EXISTS matches;');
        console.log('Table matches dropped!');
        
        await pool.query('DROP TABLE IF EXISTS likes;');
        console.log('Table likes dropped!');
        
        await pool.query('DROP TABLE IF EXISTS blocks;');
        console.log('Table blocks dropped!');
        
        await pool.query('DROP TABLE IF EXISTS profile_views;');
        console.log('Table profile_views dropped!');
        
        await pool.query('DROP TABLE IF EXISTS user_tags;');
        console.log('Table user_tags dropped!');
        
        await pool.query('DROP TABLE IF EXISTS user_photos;');
        console.log('Table user_photos dropped!');
        
        await pool.query('DROP TABLE IF EXISTS notifications;');
        console.log('Table notifications dropped!');
        
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
                popularity_score INT DEFAULT 1000,
                verification_token VARCHAR(64),
                verification_token_expires TIMESTAMP,
                reset_token VARCHAR(64),
                reset_token_expires TIMESTAMP,
                -- Location fields (RGPD compliant - only city level, not precise coords)
                location_city VARCHAR(100),
                location_country VARCHAR(100),
                location_latitude DECIMAL(10, 8),
                location_longitude DECIMAL(11, 8),
                location_consent BOOLEAN DEFAULT FALSE,
                location_manual BOOLEAN DEFAULT FALSE
            );
        `);
        console.log('Table users created with profile fields!');
        
        // Create notifications table
        await pool.query(`
            CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Table notifications created!');

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
        
        // Create 4 test accounts for debugging
        console.log('\nCreating test accounts...');
        const testPassword = await bcrypt.hash('1', 10);
        
        const testUsers = [
            { email: '1@1.1', password: testPassword },
            { email: '2@2.2', password: testPassword },
            { email: '3@3.3', password: testPassword },
            { email: '4@4.4', password: testPassword }
        ];
        
        for (const user of testUsers) {
            await pool.query(
                'INSERT INTO users (email, password) VALUES ($1, $2)',
                [user.email, user.password]
            );
            console.log(`Test user created: ${user.email} (password: Test1234!)`);
        }
        // Create profile_views table to track who viewed whose profile
        await pool.query(`
            CREATE TABLE profile_views (
                id SERIAL PRIMARY KEY,
                viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                viewed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                viewed_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(viewer_id, viewed_id)
            );
        `);
        console.log('Table profile_views created!');
        
        // Create indexes for profile_views
        await pool.query('CREATE INDEX idx_profile_views_viewed_id ON profile_views(viewed_id);');
        await pool.query('CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at DESC);');
        console.log('Indexes for profile_views created!');
        
        // Create likes table to track who liked whom
        await pool.query(`
            CREATE TABLE likes (
                id SERIAL PRIMARY KEY,
                liker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                liked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(liker_id, liked_id)
            );
        `);
        console.log('Table likes created!');
        
        // Create indexes for likes
        await pool.query('CREATE INDEX idx_likes_liker_id ON likes(liker_id);');
        await pool.query('CREATE INDEX idx_likes_liked_id ON likes(liked_id);');
        console.log('Indexes for likes created!');
        
        // Create matches table for mutual likes
        await pool.query(`
            CREATE TABLE matches (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                matched_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user1_id, user2_id)
            );
        `);
        console.log('Table matches created!');
        
        // Create indexes for matches
        await pool.query('CREATE INDEX idx_matches_user1_id ON matches(user1_id);');
        await pool.query('CREATE INDEX idx_matches_user2_id ON matches(user2_id);');
        console.log('Indexes for matches created!');
        
        // Create blocks table to track blocked users
        await pool.query(`
            CREATE TABLE blocks (
                id SERIAL PRIMARY KEY,
                blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(blocker_id, blocked_id)
            );
        `);
        console.log('Table blocks created!');
        
        // Create index for blocks
        await pool.query('CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);');
        console.log('Index for blocks created!');

        // Create messages table
        await pool.query(`
            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Table messages created!');

        // Create indexes for messages to optimize retrieval
        // This allows fast lookups for "messages sent by X", "messages received by Y"
        // and sorting by date without scanning the whole table.
        await pool.query('CREATE INDEX idx_messages_sender_id ON messages(sender_id);');
        await pool.query('CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);');
        await pool.query('CREATE INDEX idx_messages_created_at ON messages(created_at);');
        console.log('Indexes for messages created!');

        console.log('\nDatabase initialization complete!');
        
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        pool.end();
    }
})();
