const logger = require('../utils/logger');
const { Guild, User, Warning, Activity } = require('../database/mongo');

class ModerationSystem {
  constructor(client) {
    this.client = client;
    this.autoModSettings = new Map();
  }

  async initialize() {
    logger.info('Moderation System initialized');
  }

  async createCase(guildId, userId, action, reason, moderatorId) {
    const caseId = Date.now().toString(36);
    
    await Activity.create({
      guildId,
      userId,
      type: 'warning',
      data: { caseId, action, reason, moderatorId }
    });

    const guild = await Guild.findOne({ guildId });
    if (guild) {
      guild.stats.warnings = (guild.stats.warnings || 0) + 1;
      await guild.save();
    }

    return { success: true, caseId };
  }

  async getCase(guildId, caseId) {
    const activities = await Activity.find({ 
      guildId, 
      'data.caseId': caseId 
    }).sort({ createdAt: -1 });
    return activities[0];
  }

  async getUserHistory(guildId, userId) {
    return await Activity.find({ 
      guildId, 
      userId,
      type: 'warning'
    }).sort({ createdAt: -1 }).limit(50);
  }

  async getModerationStats(guildId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const warns = await Activity.countDocuments({
      guildId,
      type: 'warning',
      createdAt: { $gte: cutoff }
    });

    return {
      totalWarnings: warns,
      period: days,
      averagePerDay: Math.round(warns / days * 10) / 10
    };
  }

  async setAutoMod(guildId, settings) {
    this.autoModSettings.set(guildId, {
      ...settings,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async getAutoMod(guildId) {
    return this.autoModSettings.get(guildId) || {
      enabled: false,
      antiSpam: false,
      antiLinks: false,
      antiCaps: false,
      maxMessages: 5,
      timeWindow: 5000
    };
  }

  async checkAutoMod(guildId, message, settings) {
    if (!settings || !settings.enabled) return { triggered: false };

    const guild = message.guild;
    const member = message.member;
    
    if (!member) return { triggered: false };

    if (settings.antiSpam && message.content.length > 1000) {
      return { triggered: true, action: 'warn', reason: 'Message too long (spam detected)' };
    }

    if (settings.antiLinks && /discord\.gg|discord\.com\/invite/i.test(message.content)) {
      return { triggered: true, action: 'delete', reason: 'Links not allowed' };
    }

    if (settings.antiCaps && message.content.length > 20) {
      const capsCount = message.content.replace(/[^A-Z]/g, '').length;
      const ratio = capsCount / message.content.length;
      if (ratio > 0.7) {
        return { triggered: true, action: 'warn', reason: 'Too many caps' };
      }
    }

    return { triggered: false };
  }

  async muteUser(guildId, userId, duration, reason, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return { success: false, message: 'Guild not found' };

    const member = await guild.members.fetch(userId);
    if (!member) return { success: false, message: 'Member not found' };

    const guildData = await Guild.findOne({ guildId });
    const mutedRole = guildData?.settings?.mutedRole;

    if (mutedRole) {
      const role = guild.roles.cache.get(mutedRole);
      if (role) {
        await member.roles.add(role);
      }
    }

    await this.createCase(guildId, userId, 'mute', reason, moderatorId);

    if (duration > 0) {
      setTimeout(async () => {
        try {
          if (mutedRole) {
            const role = guild.roles.cache.get(mutedRole);
            if (role) {
              await member.roles.remove(role);
            }
          }
        } catch (e) {
          logger.error('Error removing mute:', e);
        }
      }, duration * 1000);
    }

    return { success: true, duration };
  }

  async unmuteUser(guildId, userId, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return { success: false, message: 'Guild not found' };

    const member = await guild.members.fetch(userId);
    if (!member) return { success: false, message: 'Member not found' };

    const guildData = await Guild.findOne({ guildId });
    const mutedRole = guildData?.settings?.mutedRole;

    if (mutedRole) {
      const role = guild.roles.cache.get(mutedRole);
      if (role) {
        await member.roles.remove(role);
      }
    }

    return { success: true };
  }

  async kickUser(guildId, userId, reason, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return { success: false, message: 'Guild not found' };

    const member = await guild.members.fetch(userId);
    if (!member) return { success: false, message: 'Member not found' };

    try {
      await member.kick(reason);
      await this.createCase(guildId, userId, 'kick', reason, moderatorId);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async banUser(guildId, userId, reason, moderatorId, duration = 0) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return { success: false, message: 'Guild not found' };

    try {
      if (duration > 0) {
        await guild.bans.create(userId, { reason, days: 0 });
        setTimeout(async () => {
          try {
            await guild.bans.remove(userId);
          } catch (e) {
            logger.error('Error unbanning:', e);
          }
        }, duration * 1000 * 60 * 60 * 24);
      } else {
        await guild.bans.create(userId, { reason });
      }
      
      await this.createCase(guildId, userId, 'ban', reason, moderatorId);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async addStrike(userId, guildId, reason, moderatorId) {
    const user = await User.findOne({ userId });
    if (!user) return { success: false, message: 'User not found' };

    if (!user.staff) user.staff = {};
    user.staff.warnings = (user.staff.warnings || 0) + 1;
    await user.save();

    await this.createCase(guildId, userId, 'strike', reason, moderatorId);

    return { success: true, strikes: user.staff.warnings };
  }

  async getStrikes(userId, guildId) {
    const activities = await Activity.find({
      guildId,
      userId,
      'data.action': 'strike'
    }).sort({ createdAt: -1 });

    return {
      total: activities.length,
      strikes: activities
    };
  }

  async getModerationLogs(guildId, limit = 50) {
    return await Activity.find({
      guildId,
      type: 'warning'
    }).sort({ createdAt: -1 }).limit(limit);
  }
}

module.exports = ModerationSystem;
