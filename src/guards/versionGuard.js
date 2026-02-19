const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

const OWNER_IDS = ['1357317173470564433']; // Bot owner
const BYPASS_ALL = true; // TEMP: Allow all commands for testing

const VERSIONS = {
  v1: { tier: 'free', name: 'Core Free' },
  v2: { tier: 'free', name: 'Automation Lite' },
  v3: { tier: 'premium', name: 'Premium Staff' },
  v4: { tier: 'premium', name: 'Premium Moderation' },
  v5: { tier: 'premium', name: 'Premium Analytics' },
  v6: { tier: 'enterprise', name: 'Advanced Insights' },
  v7: { tier: 'enterprise', name: 'Automation Ecosystem' },
  v8: { tier: 'enterprise', name: 'Ultimate Experience' },
  premium: { tier: 'premium', name: 'Premium Features' }
};

class VersionGuard {
  async checkAccess(guildId, userId, requiredVersion) {
    // TEMP BYPASS FOR TESTING
    if (BYPASS_ALL) {
      return { allowed: true };
    }
    
    logger.info(`[VERSION] checkAccess called: userId=${userId}, requiredVersion=${requiredVersion}, ownerIds=${OWNER_IDS.includes(userId)}`);
    
    // Bot owner always has access
    if (OWNER_IDS.includes(userId)) {
      logger.info(`[VERSION] Owner access granted for ${userId}`);
      return { allowed: true };
    }

    if (!requiredVersion || requiredVersion === 'v1' || requiredVersion === 'v2') {
      return { allowed: true };
    }

    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      return { 
        allowed: false, 
        message: '❌ Server not registered. Please re-invite the bot.' 
      };
    }

    const requiredTier = VERSIONS[requiredVersion]?.tier;
    const currentTier = guild.premium?.tier || 'free';

    if (requiredTier === 'premium' && currentTier === 'free') {
      return {
        allowed: false,
        message: '💎 **Premium Required**\nThis command requires Premium access.\nUpgrade at: [Payment Link Placeholder]\nUse `/premium` for more info.'
      };
    }

    if (requiredTier === 'enterprise' && currentTier !== 'enterprise') {
      return {
        allowed: false,
        message: '🌟 **Enterprise Required**\nThis command requires Enterprise access.\nUpgrade at: [Enterprise Payment Link]\nUse `/enterprise` for more info.'
      };
    }

    if (guild.premium?.expiresAt && new Date() > guild.premium.expiresAt) {
      guild.premium.isActive = false;
      guild.premium.tier = 'free';
      await guild.save();
      return {
        allowed: false,
        message: '⏰ **Premium Expired**\nYour premium subscription has expired. Please renew to continue using premium features.'
      };
    }

    return { allowed: true };
  }

  getVersionInfo(version) {
    return VERSIONS[version] || { tier: 'unknown', name: 'Unknown' };
  }

  getAvailableVersions(tier) {
    return Object.entries(VERSIONS)
      .filter(([_, info]) => {
        if (tier === 'free') return info.tier === 'free';
        if (tier === 'premium') return info.tier !== 'enterprise';
        return true;
      })
      .map(([version, info]) => ({ version, ...info }));
  }
}

module.exports = { versionGuard: new VersionGuard(), VERSIONS };
