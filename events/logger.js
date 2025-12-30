// events/logger.js
const EventEmitter = require('events');
const fs = require('fs/promises');
const path = require('path');

const logger = new EventEmitter();

logger.on('pageVisited', async (page) => {
    const logDir = path.join(__dirname, '..', 'logs');
    const logFile = path.join(logDir, 'page_visits.log');
    const logEntry = `${new Date().toISOString()} - Page visited: ${page}\n`;

    try {
        await fs.mkdir(logDir, { recursive: true });
        await fs.appendFile(logFile, logEntry);
    } catch (err) {
        console.error('Error writing to log file', err);
    }
});

module.exports = logger;
