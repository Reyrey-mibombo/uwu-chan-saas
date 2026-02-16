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

    const user = await User.findOne({ userId });
    if (user && user.staff) {
      user.staff.shiftTime = (user.staff.shiftTime || 0) + shift.duration;
      user.staff.lastShift = new Date();
      await user.save();
    }

    await Activity.create({
      guildId,
      userId,
      type: 'shift',
      data: { action: 'end', shiftId: shift._id, duration: shift.duration }
    });

    const hours = Math.floor(shift.duration / 3600);
    const minutes = Math.floor((shift.duration % 3600) / 60);

    return { 
      success: true, 
      duration: shift.duration,
      hours,
      minutes
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

  async getPromotionRequirements(currentRank) {
    const ranks = {
      'member': { points: 0, next: 'trial', requirements: 'None' },
      'trial': { points: 100, next: 'staff', requirements: '100 points, 80% consistency' },
      'staff': { points: 500, next: 'moderator', requirements: '500 points, 90% consistency' },
      'moderator': { points: 1000, next: 'admin', requirements: '1000 points, 95% consistency' },
      'admin': { points: 2500, next: 'owner', requirements: '2500 points, 100% consistency' }
    };
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
}

module.exports = StaffSystem;
