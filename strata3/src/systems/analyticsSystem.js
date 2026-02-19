const logger = require('../utils/logger');
const { Guild, User, Activity, Shift } = require('../database/mongo');

class AnalyticsSystem {
  constructor(client) {
    this.client = client;
  }

  async initialize() {
    logger.info('Analytics System initialized');
    setInterval(() => this.cleanupOldData(), 3600000);
  }

  async trackEvent(guildId, userId, type, data = {}) {
    await Activity.create({
      guildId,
      userId,
      type,
      data
    });

    const guild = await Guild.findOne({ guildId });
    if (guild) {
      if (type === 'message') {
        guild.stats.messagesProcessed = (guild.stats.messagesProcessed || 0) + 1;
      } else if (type === 'command') {
        guild.stats.commandsUsed = (guild.stats.commandsUsed || 0) + 1;
      }
      guild.stats.lastActivity = new Date();
      await guild.save();
    }
  }

  async getActivityStats(guildId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: cutoff }
    });

    const uniqueUsers = new Set();
    let messages = 0;
    let commands = 0;
    let shifts = 0;

    activities.forEach(a => {
      if (a.userId) uniqueUsers.add(a.userId);
      if (a.type === 'message') messages++;
      if (a.type === 'command') commands++;
      if (a.type === 'shift') shifts++;
    });

    return {
      messages,
      commands,
      shifts,
      activeUsers: uniqueUsers.size,
      avgMessagesPerDay: Math.round(messages / days),
      avgCommandsPerDay: Math.round(commands / days)
    };
  }

  async generateReport(guildId, type = 'weekly') {
    const days = type === 'weekly' ? 7 : 30;
    const stats = await this.getActivityStats(guildId, days);
    
    const previousCutoff = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
    const previousStats = await this.getActivityStats(guildId, days);

    const growth = previousStats.messages > 0 
      ? ((stats.messages - previousStats.messages) / previousStats.messages * 100).toFixed(1)
      : 0;

    const engagement = stats.activeUsers > 50 ? 'High' : stats.activeUsers > 20 ? 'Medium' : 'Low';

    return {
      type,
      days,
      generatedAt: new Date(),
      stats,
      previousStats,
      trends: {
        growth: `${growth > 0 ? '+' : ''}${growth}%`,
        engagement,
        recommendation: engagement === 'Low' ? 'Encourage more server activity' : 'Consider enabling automation'
      }
    };
  }

  async getHeatmapData(guildId) {
    const activities = await Activity.find({
      guildId,
      type: 'message',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const heatmap = Array(24).fill(0).map((_, hour) => ({
      hour,
      activity: 0,
      days: Array(7).fill(0)
    }));

    activities.forEach(a => {
      const date = new Date(a.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      heatmap[hour].activity++;
      heatmap[hour].days[day]++;
    });

    return heatmap;
  }

  async getStaffProductivity(guildId) {
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } });
    
    const productivity = await Promise.all(users.map(async u => {
      const shifts = await Shift.countDocuments({
        guildId,
        userId: u.userId,
        endTime: { $ne: null }
      });

      return {
        userId: u.userId,
        username: u.username,
        points: u.staff?.points || 0,
        warnings: u.staff?.warnings || 0,
        shiftTime: u.staff?.shiftTime || 0,
        shifts,
        score: await this.calculateProductivityScore(u)
      };
    }));

    return productivity.sort((a, b) => b.score - a.score);
  }

  async calculateProductivityScore(user) {
    const points = user.staff?.points || 0;
    const warnings = user.staff?.warnings || 0;
    const shiftTime = user.staff?.shiftTime || 0;
    const consistency = user.staff?.consistency || 100;

    return Math.min(100, Math.max(0, 
      Math.round((points / 10) + (shiftTime / 3600) * 5 + consistency - warnings * 5)
    ));
  }

  async getTopPerformers(guildId, limit = 10) {
    const users = await User.find({ 'guilds.guildId': guildId })
      .sort({ 'staff.points': -1 })
      .limit(limit);

    return users.map(u => ({
      userId: u.userId,
      username: u.username,
      points: u.staff?.points || 0,
      rank: u.staff?.rank || 'member'
    }));
  }

  async getLowPerformers(guildId, limit = 10) {
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': 1 })
      .limit(limit);

    return users.map(u => ({
      userId: u.userId,
      username: u.username,
      points: u.staff?.points || 0,
      warnings: u.staff?.warnings || 0
    }));
  }

  async getRoleDistribution(guildId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return [];

    const roles = guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        members: r.members.size
      }))
      .sort((a, b) => b.members - a.members);

    return roles;
  }

  async getEngagementScore(guildId, days = 7) {
    const stats = await this.getActivityStats(guildId, days);
    const guild = this.client.guilds.cache.get(guildId);
    
    if (!guild) return 0;
    
    const memberCount = guild.memberCount;
    const activeRatio = (stats.activeUsers / memberCount) * 100;
    const messageRatio = (stats.messages / (days * 100)) * 100;
    
    return Math.min(100, Math.round(activeRatio * 0.6 + messageRatio * 0.4));
  }

  async getServerTrends(guildId) {
    const weekStats = await this.getActivityStats(guildId, 7);
    const monthStats = await this.getActivityStats(guildId, 30);
    
    const weeklyAvg = weekStats.messages / 7;
    const monthlyAvg = monthStats.messages / 30;
    
    const trend = weeklyAvg > monthlyAvg * 1.1 ? 'Growing' : 
                  weeklyAvg < monthlyAvg * 0.9 ? 'Declining' : 'Stable';

    return {
      weeklyMessages: weekStats.messages,
      monthlyMessages: monthStats.messages,
      trend,
      change: ((weeklyAvg - monthlyAvg) / monthlyAvg * 100).toFixed(1)
    };
  }

  async cleanupOldData() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await Activity.deleteMany({ createdAt: { $lt: cutoff } });
    logger.info('Cleaned up old analytics data');
  }
}

module.exports = AnalyticsSystem;
