const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration des photos de bots avec des paramètres aléatoires pour obtenir des images différentes
const botPhotos = [
    {
        name: 'mateo',
        url: `https://cataas.com/cat?timestamp=${Date.now()}`,
        filename: 'bot_mateo_cat.jpg'
    },
    {
        name: 'sacha',
        url: `https://cataas.com/cat?timestamp=${Date.now() + 1}`,
        filename: 'bot_sacha_cat.jpg'
    },
    {
        name: 'martin',
        url: `https://cataas.com/cat?timestamp=${Date.now() + 2}`,
        filename: 'bot_martin_cat.jpg'
    }
];

// Fonction pour télécharger une image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                downloadImage(response.headers.location, filepath)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function downloadBotPhotos() {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Téléchargement des photos de chat pour les bots...\n');
    
    // Regenerate URLs with fresh timestamps for random images
    const freshBotPhotos = [
        {
            name: 'mateo',
            url: `https://cataas.com/cat?timestamp=${Date.now()}`,
            filename: 'bot_mateo_cat.jpg'
        },
        {
            name: 'sacha',
            url: `https://cataas.com/cat?timestamp=${Date.now() + 1000}`,
            filename: 'bot_sacha_cat.jpg'
        },
        {
            name: 'martin',
            url: `https://cataas.com/cat?timestamp=${Date.now() + 2000}`,
            filename: 'bot_martin_cat.jpg'
        }
    ];
    
    for (const photo of freshBotPhotos) {
        const filepath = path.join(uploadsDir, photo.filename);
        
        // Always download fresh photos (delete existing ones)
        if (fs.existsSync(filepath)) {
            console.log(`Suppression de l'ancienne photo pour ${photo.name}...`);
            fs.unlinkSync(filepath);
        }
        
        try {
            console.log(`Téléchargement de la photo pour ${photo.name}...`);
            await downloadImage(photo.url, filepath);
            console.log(`✓ Photo téléchargée: ${photo.filename}`);
            
            // Wait a bit between downloads to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error(`✗ Erreur lors du téléchargement pour ${photo.name}:`, error.message);
        }
    }
    
    console.log('\nTéléchargement des photos terminé!');
}

// Export for use as module
module.exports = { downloadBotPhotos, botPhotos };

// Run only if executed directly
if (require.main === module) {
    downloadBotPhotos()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}
