const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

// Bot 2 (Strata2) — Premium tier only. Requires guild.premium.tier = 'premium' or 'enterprise'

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

    // Check premium expired
    if (guild.premium?.expiresAt && new Date() > guild.premium.expiresAt) {
      guild.premium.isActive = false;
      guild.premium.tier = 'free';
      await guild.save();
      const renewUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const renewText = renewUrl ? `Renew at: ${renewUrl}` : 'Contact the server owner to renew.';
      return {
        allowed: false,
        message: `⏰ **Premium Expired**\nYour premium subscription has expired.\n${renewText}`
      };
    }

    // This bot requires at minimum 'premium' tier
    if (currentTier === 'free') {
      const paymentUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const upgradeText = paymentUrl ? `Upgrade at: ${paymentUrl}` : 'Use `/buy` or `/premium` in the **Strata1 Bot** to upgrade.';
      return {
        allowed: false,
        message: `💎 **Premium Required**\nThis bot (Strata2) requires a **Premium** or **Enterprise** subscription.\n\n${upgradeText}\n\n*Get Premium to unlock v3, v4, v5 commands.*`
      };
    }

    // 'premium' and 'enterprise' both have access to v3/v4/v5
    return { allowed: true };
  }

  getVersionInfo(version) {
    const VERSIONS = {
      v3: { tier: 'premium', name: 'Premium Staff' },
      v4: { tier: 'premium', name: 'Premium Moderation' },
      v5: { tier: 'premium', name: 'Premium Analytics' }
    };
    return VERSIONS[version] || { tier: 'premium', name: 'Premium' };
  }
}

module.exports = { versionGuard: new VersionGuard(), VERSIONS: {} };
