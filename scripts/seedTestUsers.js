const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { downloadBotPhotos, botPhotos } = require('./downloadBotPhotos');

// Test users configuration
const testUsers = [
    {
        first_name: 'Mateo',
        name: 'LeChatoyant',
        email: 'mateo@test.local',
        password: 'Mateo',
        gender: 'male',
        sexual_preference: 'female',
        biography: `Amateur de siestes au soleil et de ronronnements. 
Je suis du genre a vous suivre partout dans la maison et a m'asseoir sur votre clavier quand vous travaillez.
Si vous me likez, je vous like direct. Pas de jeux, que de l'amour.`,
        location_city: 'Paris',
        location_country: 'France',
        location_latitude: 48.8566,
        location_longitude: 2.3522,
        bot_behavior: 'auto_like_back',
        photo: 'bot_mateo_cat.jpg', // Real cat photo
        tags: ['Cuddling', 'Sunbathing', 'Sleeping on keyboards', 'Napping']
    },
    {
        first_name: 'Sacha',
        name: 'LeVolage',
        email: 'sacha@test.local',
        password: 'Sacha',
        gender: 'other',
        sexual_preference: 'both',
        biography: `Je suis un peu... complique. Je vous aime, je vous aime plus, c'est ca la vie non?
Attention, je suis du genre a changer d'avis comme de chemise.
Mais promis, pendant 30 secondes, je serai a vous a 100%.`,
        location_city: 'Lyon',
        location_country: 'France',
        location_latitude: 45.7640,
        location_longitude: 4.8357,
        bot_behavior: 'like_then_unlike',
        photo: 'bot_sacha_cat.jpg', // Real cat photo
        tags: ['Night zoomies', 'Knocking things off tables', 'Chasing lasers', 'Playing with strings']
    },
    {
        first_name: 'Martin',
        name: 'LeDistant',
        email: 'martin@test.local',
        password: 'Martin',
        gender: 'male',
        sexual_preference: 'both',
        biography: `Je suis tres selectif. Certains diraient "difficile", moi je dis "exigeant".
Je regarde, j'observe, mais je ne like jamais. C'est une philosophie de vie.
Si vous cherchez de l'attention, passez votre chemin. Je suis un chat, pas un chien.`,
        location_city: 'Marseille',
        location_country: 'France',
        location_latitude: 43.2965,
        location_longitude: 5.3698,
        bot_behavior: 'never_likes',
        photo: 'bot_martin_cat.jpg', // Real cat photo
        tags: ['Window gazing', 'Bird watching', 'Being brushed', 'Hiding in small spaces']
    }
];

async function seedTestUsers() {
    const client = await pool.connect();
    
    try {
        console.log('Downloading bot cat photos first...\n');
        await downloadBotPhotos();
        console.log('\nStarting test users seeding...\n');
        
        for (const user of testUsers) {
            // Check if user already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [user.email]
            );
            
            if (existingUser.rows.length > 0) {
                console.log(`User ${user.first_name} already exists, skipping...`);
                continue;
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Insert user
            const userResult = await client.query(
                `INSERT INTO users (
                    first_name, name, email, password, gender, sexual_preference,
                    biography, profile_complete, email_verified, popularity_score,
                    location_city, location_country, location_latitude, location_longitude,
                    location_consent, location_manual, bot_behavior
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, 1000, $8, $9, $10, $11, true, true, $12)
                RETURNING id`,
                [
                    user.first_name, user.name, user.email, hashedPassword,
                    user.gender, user.sexual_preference, user.biography,
                    user.location_city, user.location_country,
                    user.location_latitude, user.location_longitude,
                    user.bot_behavior
                ]
            );
            
            const userId = userResult.rows[0].id;
            console.log(`Created user: ${user.first_name} ${user.name} (ID: ${userId})`);
            
            // Insert bot cat photo
            await client.query(
                `INSERT INTO user_photos (user_id, file_path, is_profile_photo)
                 VALUES ($1, $2, true)`,
                [userId, user.photo]
            );
            console.log(`  - Added profile photo: ${user.photo}`);
            
            // Add tags
            for (const tagName of user.tags) {
                const tagResult = await client.query(
                    'SELECT id FROM tags WHERE name = $1',
                    [tagName]
                );
                
                if (tagResult.rows.length > 0) {
                    await client.query(
                        'INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [userId, tagResult.rows[0].id]
                    );
                }
            }
            console.log(`  - Added ${user.tags.length} tags`);
            console.log(`  - Bot behavior: ${user.bot_behavior}`);
            console.log('');
        }
        
        console.log('Test users seeding complete!');
        console.log('\nCredentials:');
        console.log('  - mateo@test.local / Mateo (auto-likes back)');
        console.log('  - sacha@test.local / Sacha (likes then unlikes after 30s)');
        console.log('  - martin@test.local / Martin (never likes)');
        
    } catch (error) {
        console.error('Error seeding test users:', error);
    } finally {
        client.release();
        // Close pool only when running as standalone script
        if (require.main === module) {
            pool.end();
        }
    }
}

module.exports = seedTestUsers;

// Run only if executed directly (not when required as module)
if (require.main === module) {
    seedTestUsers();
}
