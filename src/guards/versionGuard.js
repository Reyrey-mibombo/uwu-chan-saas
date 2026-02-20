const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : ['1357317173470564433'];

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
    // Convert userId to string for comparison
    const userIdStr = String(userId);
    const ownerIdsStr = OWNER_IDS.map(id => String(id));

    logger.info(`[VERSION] checkAccess: userId=${userIdStr}, requiredVersion=${requiredVersion}, isOwner=${ownerIdsStr.includes(userIdStr)}`);

    // Bot owner always has access
    if (ownerIdsStr.includes(userIdStr)) {
      logger.info(`[VERSION] Owner access granted for ${userIdStr}`);
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
      const paymentUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const upgradeText = paymentUrl ? `Upgrade at: ${paymentUrl}` : 'Contact the server owner to upgrade.';
      return {
        allowed: false,
        message: `💎 **Premium Required**\nThis command requires Premium access.\n${upgradeText}\nUse \`/premium\` for more info.`
      };
    }

    if (requiredTier === 'enterprise' && currentTier !== 'enterprise') {
      const paymentUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const upgradeText = paymentUrl ? `Upgrade at: ${paymentUrl}` : 'Contact the server owner to upgrade.';
      return {
        allowed: false,
        message: `🌟 **Enterprise Required**\nThis command requires Enterprise access.\n${upgradeText}\nUse \`/enterprise\` for more info.`
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
