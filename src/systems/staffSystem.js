const logger = require('../utils/logger');
const { User, Shift, Warning, Activity, Guild } = require('../database/mongo');

class StaffSystem {
  constructor(client) {
    this.client = client;
  }

  async initialize() {
    logger.info('Staff System initialized');
  }

  async getOrCreateUser(userId, guildId, username) {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, username, guilds: [{ guildId, joinedAt: new Date() }] });
      await user.save();
    } else {
      const guildIndex = user.guilds.findIndex(g => g.guildId === guildId);
      if (guildIndex === -1) {
        user.guilds.push({ guildId, joinedAt: new Date() });
        await user.save();
      }
    }
    return user;
  }

  async startShift(userId, guildId) {
    const user = await this.getOrCreateUser(userId, guildId);
    const shift = new Shift({
      guildId,
      userId,
      startTime: new Date()
    });
    await shift.save();

    await Activity.create({
      guildId,
      userId,
      type: 'shift',
      data: { action: 'start', shiftId: shift._id }
    });

    // --- On Duty Role Auto Assignment ---
    const guildData = await Guild.findOne({ guildId });
    if (guildData?.settings?.onDutyRole) {
      try {
        const discordGuild = await this.client.guilds.fetch(guildId);
        if (discordGuild) {
          const member = await discordGuild.members.fetch(userId);
          if (member) {
            await member.roles.add(guildData.settings.onDutyRole, 'Started Shift');
          }
        }
      } catch (e) {
        logger.error(`Failed to assign On Duty role: ${e.message}`);
      }
    }

    // --- Shift Streak Gamification ---
    let streakDays = 0;
    const now = new Date();

    // Check if there's a shift from the previous day (between 24-48 hours ago)
    const yesterdayStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find the most recent shift before today
    const lastShiftBeforeToday = await Shift.findOne({
      userId,
      guildId,
      startTime: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } // At least 12 hours ago to prevent double counting same day
    }).sort({ startTime: -1 });

    if (user && user.staff) {
      streakDays = user.staff.streak || 0;

      if (lastShiftBeforeToday) {
        const timeDiffHours = (now - lastShiftBeforeToday.startTime) / (1000 * 60 * 60);
        // If their last shift was between 12 and 48 hours ago, increment streak
        if (timeDiffHours <= 48) {
          streakDays += 1;
        } else {
          // Streak broken
          streakDays = 1;
        }
      } else {
        // First shift ever or in a long time
        streakDays = 1;
      }

      user.staff.streak = streakDays;
      await user.save();
    }

    return { success: true, startTime: shift.startTime, shiftId: shift._id, streakDays };
  }

  async endShift(userId, guildId) {
    const shift = await Shift.findOne({
      guildId,
      userId,
      endTime: null
    }).sort({ startTime: -1 });

    if (!shift) return { success: false, message: 'No active shift found' };

    shift.endTime = new Date();
    shift.duration = (shift.endTime - shift.startTime) / 1000;
    await shift.save();

    let pointsEarned = 0;
    const user = await User.findOne({ userId });
    if (user && user.staff) {
      user.staff.shiftTime = (user.staff.shiftTime || 0) + shift.duration;
      user.staff.lastShift = new Date();

      pointsEarned = Math.floor(shift.duration / 300);
      user.staff.points = (user.staff.points || 0) + pointsEarned;

      const consistency = await this.calculateConsistency(userId, guildId);
      user.staff.consistency = consistency;

      await user.save();
    }

    await Activity.create({
      guildId,
      userId,
      type: 'shift',
      data: { action: 'end', shiftId: shift._id, duration: shift.duration }
    });

    const guild = await Guild.findOne({ guildId });
    const autoPromoEnabled = guild?.settings?.modules?.automation ?? false;

    if (autoPromoEnabled) {
      const PromotionSystem = require('../utils/promotionSystem');
      await PromotionSystem.checkEligibility(userId, guildId, this.client);
    }

    const hours = Math.floor(shift.duration / 3600);
    const minutes = Math.floor((shift.duration % 3600) / 60);

    // --- Shift Trophies Check ---
    if (user && user.staff) {
      if (!user.staff.trophies) user.staff.trophies = [];
      let newTrophies = false;

      // 1. First Shift Trophy
      if (!user.staff.trophies.includes('First Shift Completed')) {
        user.staff.trophies.push('First Shift Completed');
        newTrophies = true;
      }

      // 2. Iron Man Trophy (Shift longer than 4 hours)
      if (hours >= 4 && !user.staff.trophies.includes('Iron Worker (4hr+ Shift)')) {
        user.staff.trophies.push('Iron Worker (4hr+ Shift)');
        newTrophies = true;
      }

      // 3. Streak Trophy
      if (user.staff.streak >= 7 && !user.staff.trophies.includes('7-Day Streak Master')) {
        user.staff.trophies.push('7-Day Streak Master');
        newTrophies = true;
      }

      if (newTrophies) await user.save();
    }

    // --- Remove On Duty Role ---
    if (guild?.settings?.onDutyRole) {
      try {
        const discordGuild = await this.client.guilds.fetch(guildId);
        if (discordGuild) {
          const member = await discordGuild.members.fetch(userId);
          if (member) {
            await member.roles.remove(guild.settings.onDutyRole, 'Ended Shift');
          }
        }
      } catch (e) {
        logger.error(`Failed to remove On Duty role: ${e.message}`);
      }
    }

    return {
      success: true,
      duration: shift.duration,
      hours,
      minutes,
      pointsEarned
    };
  }

  async addWarning(userId, guildId, reason, moderatorId, severity = 'medium') {
    const pointsMap = { low: 1, medium: 2, high: 3 };
    const points = pointsMap[severity] || 2;

    const warning = new Warning({
      guildId,
      userId,
      moderatorId,
      reason,
      severity,
      points
    });
    await warning.save();

    const user = await User.findOne({ userId });
    if (user && user.staff) {
      user.staff.warnings = (user.staff.warnings || 0) + points;
      await user.save();
    }

    // --- Moderation Trophies Check (For the Moderator) ---
    const moderator = await User.findOne({ userId: moderatorId });
    if (moderator && moderator.staff) {
      if (!moderator.staff.trophies) moderator.staff.trophies = [];

      const modWarnings = await Warning.countDocuments({ moderatorId });

      if (modWarnings === 1 && !moderator.staff.trophies.includes('First Warning Issued')) {
        moderator.staff.trophies.push('First Warning Issued');
        await moderator.save();
      } else if (modWarnings === 50 && !moderator.staff.trophies.includes('Justice Hammer (50 Warns)')) {
        moderator.staff.trophies.push('Justice Hammer (50 Warns)');
        await moderator.save();
      }
    }

    const guild = await Guild.findOne({ guildId });
    if (guild) {
      guild.stats.warnings = (guild.stats.warnings || 0) + 1;
      await guild.save();
    }

    await Activity.create({
      guildId,
      userId,
      type: 'warning',
      data: { warningId: warning._id, reason, severity }
    });

    return { success: true, warningId: warning._id, points };
  }

  async getWarnings(userId, guildId) {
    return await Warning.find({ guildId, userId }).sort({ createdAt: -1 });
  }

  async getUserWarnings(userId, guildId) {
    const warnings = await this.getWarnings(userId, guildId);
    return {
      total: warnings.length,
      low: warnings.filter(w => w.severity === 'low').length,
      medium: warnings.filter(w => w.severity === 'medium').length,
      high: warnings.filter(w => w.severity === 'high').length,
      warnings: warnings.slice(0, 10)
    };
  }

  async addPoints(userId, guildId, points, reason) {
    const user = await User.findOne({ userId });
    if (!user) return { success: false, message: 'User not found' };

    if (!user.staff) {
      user.staff = { points: 0, rank: 'member' };
    }
    user.staff.points = (user.staff.points || 0) + points;
    await user.save();

    await Activity.create({
      guildId,
      userId,
      type: 'command',
      data: { action: 'points', amount: points, reason }
    });

    const guild = await Guild.findOne({ guildId });
    const autoPromoEnabled = guild?.settings?.modules?.automation ?? false;

    if (autoPromoEnabled) {
      const PromotionSystem = require('../utils/promotionSystem');
      await PromotionSystem.checkEligibility(userId, guildId, this.client);
    }

    return { success: true, total: user.staff.points };
  }

  async getPoints(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return 0;
    return user.staff.points || 0;
  }

  async setRank(userId, guildId, rank) {
    const user = await this.getOrCreateUser(userId, guildId);
    if (!user.staff) user.staff = {};
    user.staff.rank = rank;
    await user.save();

    await Activity.create({
      guildId,
      userId,
      type: 'promotion',
      data: { newRank: rank }
    });

    return { success: true, rank };
  }

  async getRank(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return 'member';
    return user.staff.rank || 'member';
  }

  async calculateStaffScore(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return 0;

    const points = user.staff.points || 0;
    const warnings = user.staff.warnings || 0;
    const shiftTime = user.staff.shiftTime || 0;
    const consistency = user.staff.consistency || 100;

    const score = Math.min(100,
      (points / 10) +
      (shiftTime / 3600) * 5 +
      consistency -
      (warnings * 5)
    );

    return Math.max(0, Math.round(score));
  }

  async updateConsistency(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      guildId,
      userId,
      createdAt: { $gte: weekAgo }
    });

    const expectedShifts = 14;
    const actualShifts = activities.filter(a => a.type === 'shift').length;
    const consistency = Math.min(100, Math.round((actualShifts / expectedShifts) * 100));

    user.staff.consistency = consistency;
    await user.save();

    return consistency;
  }

  async getLeaderboard(guildId, limit = 10) {
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(limit);

    return users.map(u => ({
      userId: u.userId,
      username: u.username,
      points: u.staff?.points || 0,
      rank: u.staff?.rank || 'member',
      warnings: u.staff?.warnings || 0
    }));
  }

  async calculateConsistency(userId, guildId) {
    const shifts = await Shift.find({ userId, guildId, endTime: { $ne: null } }).sort({ endTime: -1 }).limit(30);

    if (shifts.length === 0) return 100;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentShifts = shifts.filter(s => new Date(s.endTime) > weekAgo);

    if (recentShifts.length === 0) return 0;

    const expectedShiftsPerWeek = 3;
    const consistency = Math.min(100, Math.round((recentShifts.length / expectedShiftsPerWeek) * 100));

    return consistency;
  }
}

module.exports = StaffSystem;
