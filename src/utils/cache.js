const { createClient } = require('redis');
const logger = require('./logger'); // Or console.log if logger is missing

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// In-Memory Fallback Map
const memoryCache = new Map();
let isConnected = false;

const redisClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            // Prevent infinite ECONNREFUSED spam logging
            if (retries > 3) {
                console.log('Redis connection disabled after 3 retries. Gracefully falling back to integrated memory cache.');
                return new Error('Max reconnect retries reached - Redis is offline.');
            }
            return Math.min(retries * 50, 500);
        }
    }
});

redisClient.on('error', (err) => {
    // Only log the first error occurrence to avoid cluttering the terminal output
    if (!redisClient.__errorLogged) {
        console.error('Redis Connection Refused:', err.message);
        redisClient.__errorLogged = true;
    }
});

redisClient.on('connect', () => {
    isConnected = true;
    console.log('Connected to Redis instance.');
});

// Connect to Redis asynchronously 
redisClient.connect().catch(() => {
    isConnected = false;
});

// Export a transparent wrapper mimicking Redis functions but routing to memoryCache if offline
module.exports = {
    get: async (key) => {
        if (isConnected) {
            try { return await redisClient.get(key); } catch (e) { }
        }
        const entry = memoryCache.get(key);
        if (entry && entry.expires > Date.now()) return entry.value;
        if (entry && entry.expires <= Date.now()) memoryCache.delete(key);
        return null;
    },
    setEx: async (key, seconds, value) => {
        if (isConnected) {
            try { return await redisClient.setEx(key, seconds, value); } catch (e) { }
        }
        memoryCache.set(key, { value, expires: Date.now() + (seconds * 1000) });
    },
    set: async (key, value) => {
        if (isConnected) {
            try { return await redisClient.set(key, value); } catch (e) { }
        }
        memoryCache.set(key, { value, expires: Infinity });
    },
    del: async (key) => {
        if (isConnected) {
            try { return await redisClient.del(key); } catch (e) { }
        }
        memoryCache.delete(key);
    }
};
