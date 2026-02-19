const express = require('express');
const router = express.Router();
const { License, Guild } = require('../database/mongo');
const logger = require('../utils/logger');

const verifySecret = (req, res, next) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/:guildId', async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    res.json({
      guildId: guild.guildId,
      premium: guild.premium,
      settings: guild.settings
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create', verifySecret, async (req, res) => {
  try {
    const { userId, tier, guildId } = req.body;
    const licenseSystem = req.app.locals.client?.systems?.license;
    
    if (!licenseSystem) {
      return res.status(503).json({ error: 'License system not available' });
    }

    const license = await licenseSystem.createLicense(userId, tier, {
      id: 'manual',
      provider: 'manual',
      metadata: { createdBy: 'api' }
    });

    if (guildId) {
      await licenseSystem.activateLicense(license.key, guildId, userId);
    }

    res.json({ success: true, license });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/extend', verifySecret, async (req, res) => {
  try {
    const { key, days } = req.body;
    const licenseSystem = req.app.locals.client?.systems?.license;
    
    if (!licenseSystem) {
      return res.status(503).json({ error: 'License system not available' });
    }

    const result = await licenseSystem.extendLicense(key, days);
    res.json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
