const express = require('express');
const router = express.Router();
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

// Authentication middleware - verify API secret
function verifySecret(req, res, next) {
    const apiSecret = req.headers['x-api-secret'];
    if (!apiSecret || apiSecret !== process.env.API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

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

router.get('/:guildId/stats', verifySecret, async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Validate guildId format
        if (!/^\d{17,20}$/.test(String(guildId))) {
            return res.status(400).json({ error: 'Invalid guild ID format' });
        }
        
        const guild = await Guild.findOne({ guildId });
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

router.patch('/:guildId/settings', verifySecret, async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Validate guildId format
        if (!/^\d{17,20}$/.test(String(guildId))) {
            return res.status(400).json({ error: 'Invalid guild ID format' });
        }
        
        // Sanitize input to prevent NoSQL injection
        const sanitizedBody = sanitizeInput(req.body);
        
        // Validate and clean updates
        const allowedFields = ['settings', 'premium', 'stats'];
        const updates = {};
        
        for (const field of allowedFields) {
            if (sanitizedBody[field] !== undefined) {
                updates[field] = sanitizedBody[field];
            }
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        updates.updatedAt = new Date();
        
        const guild = await Guild.findOneAndUpdate(
            { guildId },
            { $set: updates },
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

router.get('/', verifySecret, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
        const skip = (page - 1) * limit;

        // Validate pagination params
        if (page < 1 || limit < 1) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        const guilds = await Guild.find()
            .skip(skip)
            .limit(limit)
            .select('guildId name premium.tier stats');

        const total = await Guild.countDocuments();

        res.json({
            guilds,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching guilds list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
