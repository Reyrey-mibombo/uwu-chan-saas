const express = require('express');
const router = express.Router();
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

router.get('/:guildId/stats', async (req, res) => {
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
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:guildId/settings', async (req, res) => {
  try {
    const updates = req.body;
    const guild = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { settings: updates, updatedAt: new Date() } },
      { new: true }
    );

    res.json({ success: true, settings: guild.settings });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
