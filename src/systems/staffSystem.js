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

    return { success: true, startTime: shift.startTime, shiftId: shift._id };
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
      await this.checkAutoPromotion(userId, guildId);
    }

    const hours = Math.floor(shift.duration / 3600);
    const minutes = Math.floor((shift.duration % 3600) / 60);

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
      await this.checkAutoPromotion(userId, guildId);
    }

    return { success: true, total: user.staff.points };
  }

  async checkAutoPromotion(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return;

    const guild = await Guild.findOne({ guildId });
    if (!guild) return;

    const currentRank = user.staff.rank || 'member';
    const points = user.staff.points || 0;
    const consistency = user.staff.consistency || 0;
    const reputation = user.staff.reputation || 0;
    const achievements = user.staff.achievements || [];

    const shiftCount = await Shift.countDocuments({ userId, guildId, endTime: { $ne: null } });
    const warningCount = await Warning.countDocuments({ userId, guildId });
    
    const userGuild = user.guilds?.find(g => g.guildId === guildId);
    const daysInServer = userGuild ? Math.floor((Date.now() - new Date(userGuild.joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const ranks = ['staff', 'senior', 'manager', 'admin'];
    const rankOrder = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
    const currentIndex = rankOrder.indexOf(currentRank);

    for (const rank of ranks) {
      const req = guild.promotionRequirements?.[rank];
      if (!req) continue;

      const reqPoints = req.points || 0;
      const reqShifts = req.shifts || 0;
      const reqConsistency = req.consistency || 0;
      const reqMaxWarnings = req.maxWarnings ?? 3;
      const reqShiftHours = req.shiftHours || 0;
      const reqAchievements = req.achievements || 0;
      const reqReputation = req.reputation || 0;
      const reqDaysInServer = req.daysInServer || 0;
      const reqCleanRecordDays = req.cleanRecordDays || 0;

      const meetsPoints = points >= reqPoints;
      const meetsShifts = shiftCount >= reqShifts;
      const meetsConsistency = consistency >= reqConsistency;
      const meetsWarnings = warningCount <= reqMaxWarnings;
      const meetsShiftHours = (user.staff.shiftTime || 0) >= (reqShiftHours * 3600);
      const meetsAchievements = achievements.length >= reqAchievements;
      const meetsReputation = reputation >= reqReputation;
      const meetsDaysInServer = daysInServer >= reqDaysInServer;

      const cleanRecordDays = warningCount === 0 ? daysInServer : 0;
      const meetsCleanRecord = cleanRecordDays >= reqCleanRecordDays;

      const newIndex = rankOrder.indexOf(rank);
      
      const allRequirements = [
        meetsPoints,
        meetsShifts, 
        meetsConsistency,
        meetsWarnings,
        meetsShiftHours,
        meetsAchievements,
        meetsReputation,
        meetsDaysInServer,
        meetsCleanRecord
      ].filter(r => r !== undefined).length;
      
      const metCount = allRequirements.filter(r => r === true).length;
      const totalCount = allRequirements.filter(r => r !== false).length;

      if (metCount === totalCount && newIndex > currentIndex) {
        user.staff.rank = rank;
        await user.save();

        await Activity.create({
          guildId,
          userId,
          type: 'promotion',
          data: { 
            newRank: rank, 
            auto: true, 
            requirements: { 
              points: reqPoints, 
              shifts: reqShifts, 
              consistency: reqConsistency,
              maxWarnings: reqMaxWarnings,
              shiftHours: reqShiftHours,
              achievements: reqAchievements,
              reputation: reqReputation,
              daysInServer: reqDaysInServer,
              cleanRecordDays: reqCleanRecordDays
            } 
          }
        });

        const discordGuild = this.client.guilds.cache.get(guildId);
        if (discordGuild) {
          const member = discordGuild.members.cache.get(userId);
          if (member) {
            const rankRole = guild.rankRoles?.[rank];
            if (rankRole) {
              try {
                await member.roles.add(rankRole);
              } catch (e) {}
            }
          }

          const promotionChannel = guild.settings?.promotionChannel;
          if (promotionChannel) {
            const channel = discordGuild.channels.cache.get(promotionChannel);
            if (channel) {
              const userTag = user.username || 'Unknown';
              channel.send(`🎉 **${userTag}** has been promoted to **${rank.toUpperCase()}**! (Auto-promotion)`);
            }
          }
        }
        break;
      }
    }
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

  async getPromotionRequirements(currentRank, guildId) {
    const guild = await Guild.findOne({ guildId });
    const ranks = {
      'member': { points: 0, next: 'trial', shifts: 0, consistency: 0 },
      'trial': { points: 50, next: 'staff', shifts: 3, consistency: 50 },
      'staff': { points: 100, next: 'senior', shifts: 5, consistency: 70 },
      'senior': { points: 300, next: 'manager', shifts: 10, consistency: 75 },
      'manager': { points: 600, next: 'admin', shifts: 20, consistency: 80 },
      'admin': { points: 1000, next: 'owner', shifts: 30, consistency: 85 }
    };

    if (guild?.promotionRequirements) {
      const nextRank = ranks[currentRank]?.next;
      if (nextRank && guild.promotionRequirements[nextRank]) {
        return guild.promotionRequirements[nextRank];
      }
    }

    return ranks[currentRank] || ranks['member'];
  }

  async predictPromotion(userId, guildId) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return null;

    const currentRank = user.staff.rank || 'member';
    const requirements = await this.getPromotionRequirements(currentRank);
    const currentPoints = user.staff.points || 0;
    const pointsNeeded = Math.max(0, requirements.points - currentPoints);

    const avgPointsPerWeek = 50;
    const weeksNeeded = Math.ceil(pointsNeeded / avgPointsPerWeek);

    return {
      currentRank,
      nextRank: requirements.next,
      currentPoints,
      pointsNeeded,
      estimatedWeeks: weeksNeeded
    };
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
