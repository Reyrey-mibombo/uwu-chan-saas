const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');
const { validateGuildId, validatePagination, validateNoSQLInjection } = require('../middleware/validation');

// Rate limiting for guild endpoints
const guildRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Authentication middleware - verify API secret
function verifySecret(req, res, next) {
    const apiSecret = req.headers['x-api-secret'];
    if (!apiSecret || apiSecret !== process.env.API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

router.use(guildRateLimiter);
router.use(validateNoSQLInjection);

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'object' || input === null) return input;
    const sanitized = {};
    for (const key of Object.keys(input)) {
        // Prevent prototype pollution
        if (key.startsWith('__') || key === 'constructor' || key === 'prototype') continue;
        // Only allow alphanumeric and underscore in keys
        if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
        sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
}

router.get('/:guildId/stats', validateGuildId, async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

        res.json({
            guildId: guild.guildId,
            name: guild.name,
            stats: guild.stats,
            premium: guild.premium,
            memberCount: guild.memberCount || 0
        });
    } catch (error) {
        logger.error('Error fetching guild stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/:guildId/settings', validateGuildId, async (req, res) => {
  try {
    const updates = req.body;
    // Validate that updates is an object
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Settings must be a valid object' });
    }
    
        // Sanitize input to prevent NoSQL injection
        const sanitizedBody = sanitizeInput(req.body);
        
        // Validate and clean updates
        const allowedFields = ['settings', 'premium', 'stats'];
        const cleanUpdates = {};
        
        for (const field of allowedFields) {
            if (sanitizedBody[field] !== undefined) {
                cleanUpdates[field] = sanitizedBody[field];
            }
        }
        
        if (Object.keys(cleanUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        cleanUpdates.updatedAt = new Date();
    const guild = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
          { $set: cleanUpdates },
          { new: true, upsert: false }
    );

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    res.json({ success: true, settings: guild.settings });
  } catch (error) {
    logger.error('Error updating guild settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Maximum limit to prevent resource exhaustion
    const effectiveLimit = Math.min(limit, 100);

        // Validate pagination params
        if (page < 1 || effectiveLimit < 1) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

    const guilds = await Guild.find()
          .skip(skip)
          .limit(effectiveLimit)
          .select('guildId name premium.tier stats');

        const total = await Guild.countDocuments();

    res.json({
      guilds,
      pagination: {
        page,
        limit: effectiveLimit,
        total,
        pages: Math.ceil(total / effectiveLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching guilds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
