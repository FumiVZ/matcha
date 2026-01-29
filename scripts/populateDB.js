const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const CATS_DIR = path.join(__dirname, '../Cats');
const UPLOADS_DIR = path.join(__dirname, '../uploads/photos');

// Helper to generate random string
function randomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Helper to get random integer
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get random element from array
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Base coordinates from populateDB.sh
const baseCoordinates = [
    { lat: 45.7548, lon: 4.8307, name: 'Lyon' },      // 45°45'17.6"N 4°49'50.8"E
    { lat: 48.8644, lon: 2.3433, name: 'Paris' },     // 48°51'52.0"N 2°20'36.1"E
    { lat: 51.5142, lon: -0.1160, name: 'London' },   // 51°30'51.1"N 0°06'57.7"W
    { lat: 52.5215, lon: 13.4064, name: 'Berlin' },   // 52°31'17.7"N 13°24'23.1"E
    { lat: 40.7465, lon: -73.9867, name: 'NYC' },     // 40°44'47.4"N 73°59'12.4"W
    { lat: 41.8922, lon: 12.4858, name: 'Rome' },     // 41°53'32.0"N 12°29'09.1"E
    { lat: 55.7548, lon: 37.6281, name: 'Moscow' },   // 55°45'17.6"N 37°37'41.2"E
    { lat: 39.9127, lon: 116.4210, name: 'Beijing' }  // 39°54'45.9"N 116°25'15.6"E
];

const genders = ['male', 'female'];
const sexualPreferences = ['male', 'female', 'both'];

// Fluctuate coordinates (approx 0-100km radius)
function fluctuateCoordinates(lat, lon) {
    // 100km max offset
    // 1 deg lat ~ 111km
    const maxLatOffset = 100 / 111;
    const latOffset = (Math.random() * 2 - 1) * maxLatOffset;
    const newLat = lat + latOffset;

    // 1 deg lon = 111 * cos(lat)
    const kmPerLonDeg = 111 * Math.cos(newLat * Math.PI / 180);
    const maxLonOffset = 100 / Math.abs(kmPerLonDeg);
    const lonOffset = (Math.random() * 2 - 1) * maxLonOffset;
    const newLon = lon + lonOffset;

    return { lat: newLat, lon: newLon };
}

(async () => {
    try {
        console.log('Starting DB population...');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(UPLOADS_DIR)){
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        // Get all tags
        const tagsResult = await pool.query('SELECT id FROM tags');
        const tagIds = tagsResult.rows.map(row => row.id);

        if (tagIds.length === 0) {
            console.error('No tags found in DB! Please run initDB.js first.');
            process.exit(1);
        }

        // Get files from Cats directory
        const files = fs.readdirSync(CATS_DIR);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

        console.log(`Found ${imageFiles.length} images in ${CATS_DIR}`);

        // Common password for all users
        const hashedPassword = await bcrypt.hash('1', 10);
        const biography = "This is a random profile generated for testing purposes. I love cats!";
        const totalImages = imageFiles.length;

        for (let i = 0; i < totalImages; i++) {
            const filename = imageFiles[i];
            const username = 'user_' + randomString(8);
            const firstName = 'Test';
            const lastName = 'User';
            const email = `${username}@example.com`;
            
            const gender = getRandomElement(genders);
            const sexPref = getRandomElement(sexualPreferences);
            
            // Random birthdate (0 to 30 years old)
            const age = getRandomInt(0, 30);
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            const birthMonth = getRandomInt(1, 12);
            const birthDay = getRandomInt(1, 28);
            const birthdate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

            // Location
            const baseLoc = getRandomElement(baseCoordinates);
            const { lat, lon } = fluctuateCoordinates(baseLoc.lat, baseLoc.lon);

            // Random popularity score
            const popularityScore = getRandomInt(0, 1200);

            // Insert User
            const userQuery = `
                INSERT INTO users (
                    username, first_name, name, email, password, 
                    gender, sexual_preference, biography, birthdate,
                    location_city, location_country, location_latitude, location_longitude,
                    profile_complete, email_verified, popularity_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, TRUE, $14)
                RETURNING id
            `;
            
            const userValues = [
                username, firstName, lastName, email, hashedPassword,
                gender, sexPref, biography, birthdate,
                baseLoc.name, 'Unknown', lat, lon, popularityScore
            ];

            const userRes = await pool.query(userQuery, userValues);

            const userId = userRes.rows[0].id;

            // Handle Photo
            // Copy file to uploads/photos with unique name
            const ext = path.extname(filename);
            const newFilename = `${userId}_${Date.now()}${ext}`;
            const sourcePath = path.join(CATS_DIR, filename);
            const destPath = path.join(UPLOADS_DIR, newFilename);

            fs.copyFileSync(sourcePath, destPath);

            // Insert Photo record
            // Store just the filename as the server expects
            await pool.query(
                `INSERT INTO user_photos (user_id, file_path, is_profile_photo) VALUES ($1, $2, TRUE)`,
                [userId, newFilename]
            );

            // Random Tags (pick 3-5 tags)
            const numTags = getRandomInt(3, 5);
            const shuffledTags = tagIds.sort(() => 0.5 - Math.random());
            const selectedTags = shuffledTags.slice(0, numTags);

            for (const tagId of selectedTags) {
                await pool.query(
                    `INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)`,
                    [userId, tagId]
                );
            }

            // Progress logging
            if ((i + 1) % 10 === 0 || i === totalImages - 1) {
                console.log(`Processed ${i + 1}/${totalImages} profiles...`);
            }
        }

        console.log('Database population complete!');

    } catch (err) {
        console.error('Error populating database:', err);
    } finally {
        pool.end();
    }
})();
