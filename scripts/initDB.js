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
                username VARCHAR(50) UNIQUE,
                first_name VARCHAR(100),
                name VARCHAR(100),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                gender VARCHAR(20),
                sexual_preference VARCHAR(20),
                biography TEXT,
                birthdate DATE,
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
                location_manual BOOLEAN DEFAULT FALSE,
                -- Online status fields
                is_online BOOLEAN DEFAULT FALSE,
                last_online TIMESTAMP DEFAULT NOW(),
                bot_behavior VARCHAR(50) DEFAULT NULL
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
            { 
                username: 'catLover90',
                email: '1@1.1', 
                password: testPassword, 
                gender: 'male', 
                sexual_preference: 'female', 
                biography: 'I like cats', 
                birthdate: '1990-01-01',
                location_city: 'Paris',
                location_country: 'France',
                location_latitude: 48.8566,
                location_longitude: 2.3522
            },
            { 
                username: 'parisien2000',
                email: 'eee@20fd.fr', 
                password: testPassword, 
                gender: 'male', 
                sexual_preference: 'female', 
                biography: 'I like cats', 
                birthdate: '1990-01-01',
                location_city: 'Paris',
                location_country: 'France',
                location_latitude: 48.8566,
                location_longitude: 2.3522
            },
            { 
                username: 'dogFan2000',
                email: '2@2.2', 
                password: testPassword, 
                gender: 'female', 
                sexual_preference: 'male', 
                biography: 'I like dogs', 
                birthdate: '2000-01-01',
                location_city: 'London',
                location_country: 'United Kingdom',
                location_latitude: 51.5074,
                location_longitude: -0.1278
            },
            { 
                username: 'birdWatcher85',
                email: '3@3.3', 
                password: testPassword, 
                gender: 'male', 
                sexual_preference: 'male', 
                biography: 'I like birds', 
                birthdate: '1985-05-05',
                location_city: 'Berlin',
                location_country: 'Germany',
                location_latitude: 52.5200,
                location_longitude: 13.4050
            },
            { 
                username: 'fishLover95',
                email: '4@4.4', 
                password: testPassword, 
                gender: 'female', 
                sexual_preference: 'female', 
                biography: 'I like fish', 
                birthdate: '1995-12-31',
                location_city: 'Madrid',
                location_country: 'Spain',
                location_latitude: 40.4168,
                location_longitude: -3.7038
            }
        ];
        
        for (const user of testUsers) {
            await pool.query(
                `INSERT INTO users (
                    username, email, password, gender, sexual_preference, biography, birthdate, 
                    profile_complete, email_verified, 
                    location_city, location_country, location_latitude, location_longitude
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, $8, $9, $10, $11)`,
                [
                    user.username, user.email, user.password, user.gender, user.sexual_preference, 
                    user.biography, user.birthdate,
                    user.location_city, user.location_country, 
                    user.location_latitude, user.location_longitude
                ]
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

        // Create indexes for location to optimize radius search
        // Without these, the radius query would require scanning every user row (Full Table Scan), 
        // which becomes very slow as the user base grows.
        await pool.query('CREATE INDEX idx_users_location_lat ON users(location_latitude);');
        await pool.query('CREATE INDEX idx_users_location_lon ON users(location_longitude);');
        console.log('Indexes for location created!');

        // Seed test messages and match for 1@1.1 and 2@2.2
        console.log('\nSeeding test conversation...');
        const user1Res = await pool.query('SELECT id FROM users WHERE email = $1', ['1@1.1']);
        const user2Res = await pool.query('SELECT id FROM users WHERE email = $1', ['2@2.2']);

        if (user1Res.rows.length > 0 && user2Res.rows.length > 0) {
            const u1 = user1Res.rows[0].id;
            const u2 = user2Res.rows[0].id;

            // 1. Create mutual likes
            await pool.query('INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [u1, u2]);
            await pool.query('INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [u2, u1]);
            console.log('Mutual likes created!');

            // 2. Create match
            // Ensure smaller ID is first to maintain consistency if the app relies on it, 
            // though the table constraint is UNIQUE(user1_id, user2_id) so order matters for uniqueness
            // usually match tables sort ids to avoid (1,2) and (2,1) duplicates.
            const firstId = Math.min(u1, u2);
            const secondId = Math.max(u1, u2);

            await pool.query('INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [firstId, secondId]);
            console.log('Match created!');

            // 3. Create messages
            const messages = [
                { sender: u1, receiver: u2, content: 'Hey! I saw you like dogs. Are you a dog person?', hours: 24 },
                { sender: u2, receiver: u1, content: 'Hi! Yes, absolutely. But I see you prefer cats?', hours: 23 },
                { sender: u1, receiver: u2, content: 'I do, but I can appreciate a good doggo too.', hours: 22 },
                { sender: u2, receiver: u1, content: 'That is good to hear! Maybe we can meet up sometime?', hours: 2 }
            ];

            for (const msg of messages) {
                const timestamp = new Date();
                timestamp.setHours(timestamp.getHours() - msg.hours);
                await pool.query(
                    'INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES ($1, $2, $3, $4)',
                    [msg.sender, msg.receiver, msg.content, timestamp]
                );
            }
            console.log(`Created ${messages.length} test messages!`);
        }

        console.log('\nDatabase initialization complete!');
        
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        pool.end();
    }
})();
