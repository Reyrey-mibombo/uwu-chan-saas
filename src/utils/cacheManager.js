const redis = require('redis');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  async connect() {
    if (this.isConnected) return;

    try {
      if (process.env.REDIS_URL) {
        this.client = redis.createClient({
          url: process.env.REDIS_URL
        });
      } else {
        this.client = redis.createClient();
      }

      this.client.on('error', (err) => {
        logger.error('[Cache] Redis error:', err);
      });

      this.client.on('connect', () => {
        logger.info('[Cache] Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('[Cache] Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('[Cache] Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`[Cache] Error setting key ${key}:`, error);
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      this.stats.deletes++;
      return true;
    } catch (error) {
      logger.error(`[Cache] Error deleting key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.isConnected) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.stats.deletes += keys.length;
      }
      return keys.length;
    } catch (error) {
      logger.error(`[Cache] Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`[Cache] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async ttl(key) {
    if (!this.isConnected) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`[Cache] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  async increment(key, amount = 1) {
    if (!this.isConnected) return null;

    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`[Cache] Error incrementing key ${key}:`, error);
      return null;
    }
  }

  async getOrSet(key, factory, ttl = this.defaultTTL) {
    let value = await this.get(key);
    
    if (value === null) {
      try {
        value = await factory();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      } catch (error) {
        logger.error(`[Cache] Error in factory for key ${key}:`, error);
      }
    }

    return value;
  }

  async warmCache(patterns) {
    logger.info('[Cache] Starting cache warming...');
    
    for (const { key, factory, ttl } of patterns) {
      try {
        const value = await factory();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
          logger.info(`[Cache] Warmed: ${key}`);
        }
      } catch (error) {
        logger.error(`[Cache] Error warming key ${key}:`, error);
      }
    }

    logger.info('[Cache] Cache warming completed');
  }

  async cleanup() {
    if (!this.isConnected) return;

    try {
      // Delete keys that are close to expiring (less than 60 seconds)
      // This is handled automatically by Redis, but we can force cleanup if needed
      logger.info('[Cache] Cleanup completed');
    } catch (error) {
      logger.error('[Cache] Error during cleanup:', error);
    }
  }

  async flush() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushDb();
      logger.info('[Cache] Database flushed');
      return true;
    } catch (error) {
      logger.error('[Cache] Error flushing database:', error);
      return false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  generateKey(...parts) {
    return parts.join(':');
  }

  // Guild-specific cache helpers
  guildKey(guildId, ...parts) {
    return this.generateKey('guild', guildId, ...parts);
  }

  userKey(userId, ...parts) {
    return this.generateKey('user', userId, ...parts);
  }

  commandKey(commandName, ...parts) {
    return this.generateKey('cmd', commandName, ...parts);
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('[Cache] Redis disconnected');
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
