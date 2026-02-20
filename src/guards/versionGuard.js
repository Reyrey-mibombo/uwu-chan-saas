const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

// Bot 3 (Strata3) — Enterprise tier only. Requires guild.premium.tier = 'enterprise'

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : ['1357317173470564433'];

class VersionGuard {
  async checkAccess(guildId, userId, requiredVersion) {
    const userIdStr = String(userId);
    const ownerIdsStr = OWNER_IDS.map(id => String(id));

    logger.info(`[VERSION] checkAccess: userId=${userIdStr}, requiredVersion=${requiredVersion}`);

    // Bot owner always has access
    if (ownerIdsStr.includes(userIdStr)) {
      logger.info(`[VERSION] Owner access granted for ${userIdStr}`);
      return { allowed: true };
    }

    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      return {
        allowed: false,
        message: '❌ **Server Not Registered**\nThis server isn\'t in our system yet. Please have a server admin use the `/buy` command in **Strata1 Bot** to get started.'
      };
    }

    const currentTier = guild.premium?.tier || 'free';

    // Check enterprise expired
    if (guild.premium?.expiresAt && new Date() > guild.premium.expiresAt) {
      guild.premium.isActive = false;
      guild.premium.tier = 'free';
      await guild.save();
      const renewUrl = process.env.ENTERPRISE_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const renewText = renewUrl ? `Renew at: ${renewUrl}` : 'Use `/enterprise` in the **Strata1 Bot** to renew.';
      return {
        allowed: false,
        message: `⏰ **Enterprise Expired**\nYour enterprise subscription has expired.\n${renewText}`
      };
    }

    // This bot requires ENTERPRISE tier only — free and premium are both blocked
    if (currentTier !== 'enterprise') {
      const enterpriseUrl = process.env.ENTERPRISE_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const upgradeText = enterpriseUrl
        ? `Upgrade at: ${enterpriseUrl}`
        : 'Use `/buy` or `/enterprise` in the **Strata1 Bot** to upgrade.';

      const tierMsg = currentTier === 'premium'
        ? `💎 You have **Premium** but this bot requires **Enterprise**.\n\nEnterprise unlocks v6, v7, v8 commands (100 commands).\n\n${upgradeText}`
        : `🌟 **Enterprise Required**\nThis bot (Strata3) requires an **Enterprise** subscription.\n\nEnterprise unlocks v6, v7, v8 commands (100 commands).\n\n${upgradeText}`;

      return {
        allowed: false,
        message: tierMsg
      };
    }

    return { allowed: true };
  }

  getVersionInfo(version) {
    const VERSIONS = {
      v6: { tier: 'enterprise', name: 'Advanced Insights' },
      v7: { tier: 'enterprise', name: 'Automation Ecosystem' },
      v8: { tier: 'enterprise', name: 'Ultimate Experience' }
    };
    return VERSIONS[version] || { tier: 'enterprise', name: 'Enterprise' };
  }
}

module.exports = { versionGuard: new VersionGuard(), VERSIONS: {} };
