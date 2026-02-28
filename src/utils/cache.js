const { createClient } = require('redis');
const logger = require('./logger'); // Or console.log if logger is missing

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// Connect to Redis in the background
redisClient.connect().catch(console.error);

module.exports = redisClient;
