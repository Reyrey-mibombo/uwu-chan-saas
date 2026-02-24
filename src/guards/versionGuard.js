const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : ['1357317173470564433'];

const VERSION_TIER_MAP = {
  v1: 'free',
  v2: 'free',
  v3: 'premium',
  v4: 'premium',
  v5: 'premium',
  v6: 'enterprise',
  v7: 'enterprise',
  v8: 'enterprise'
};

const VERSION_NAMES = {
  v1: 'Base Commands',
  v2: 'Staff Tools',
  v3: 'Premium Analytics',
  v4: 'Premium Moderation',
  v5: 'Premium Staff',
  v6: 'Advanced Insights',
  v7: 'Automation Ecosystem',
  v8: 'Ultimate Experience'
};

class VersionGuard {
  async checkAccess(guildId, userId, requiredVersion) {
    const userIdStr = String(userId);
    const ownerIdsStr = OWNER_IDS.map(id => String(id));

    logger.info(`[VERSION] checkAccess: userId=${userIdStr}, requiredVersion=${requiredVersion}`);

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

    if (guild.premium?.expiresAt && new Date() > guild.premium.expiresAt) {
      guild.premium.isActive = false;
      guild.premium.tier = 'free';
      await guild.save();
      const renewUrl = process.env.ENTERPRISE_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
      const renewText = renewUrl ? `Renew at: ${renewUrl}` : 'Use `/enterprise` in the **Strata1 Bot** to renew.';
      return {
        allowed: false,
        message: `⏰ **Subscription Expired**\nYour subscription has expired.\n${renewText}`
      };
    }

    const requiredTier = VERSION_TIER_MAP[requiredVersion] || 'enterprise';
    const tierOrder = ['free', 'premium', 'enterprise'];
    const currentTierIndex = tierOrder.indexOf(currentTier);
    const requiredTierIndex = tierOrder.indexOf(requiredTier);

    if (currentTierIndex < requiredTierIndex) {
      const upgradeUrl = currentTier === 'free' 
        ? (process.env.PREMIUM_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || null)
        : (process.env.ENTERPRISE_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || null);
      
      const upgradeText = upgradeUrl ? `Upgrade at: ${upgradeUrl}` : 'Use `/buy` or `/premium` in the **Strata1 Bot** to upgrade.';
      
      const tierMsg = requiredTier === 'premium'
        ? `💎 **Premium Required**\n\n${VERSION_NAMES[requiredVersion]} requires **Premium** or **Enterprise**.\n\n✅ **Premium unlocks:** v1-v5 commands\n🌟 **Enterprise unlocks:** v1-v8 commands (all)\n\n${upgradeText}`
        : `🌟 **Enterprise Required**\n\n${VERSION_NAMES[requiredVersion]} requires **Enterprise**.\n\n✅ **Free unlocks:** v1-v2 commands\n💎 **Premium unlocks:** v1-v5 commands\n🌟 **Enterprise unlocks:** v1-v8 commands (all)\n\n${upgradeText}`;

      return {
        allowed: false,
        message: tierMsg
      };
    }

    return { allowed: true };
  }

  getVersionInfo(version) {
    return {
      tier: VERSION_TIER_MAP[version] || 'enterprise',
      name: VERSION_NAMES[version] || 'Unknown'
    };
  }
}

module.exports = { versionGuard: new VersionGuard(), VERSIONS: VERSION_TIER_MAP };
