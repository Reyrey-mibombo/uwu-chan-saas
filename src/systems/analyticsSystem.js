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

  // ═══════════════════════════════════════════════════════════
  // WEB DASHBOARD ENHANCED METHODS
  // ═══════════════════════════════════════════════════════════

  async getDashboardStats(guildId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      activities,
      commandStats,
      activityByDay,
      topUsers
    ] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: cutoff } }).lean(),
      Activity.aggregate([
        { $match: { guildId, type: 'command', createdAt: { $gte: cutoff } } },
        { $group: { _id: '$data.command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Activity.aggregate([
        { $match: { guildId, createdAt: { $gte: cutoff } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            commands: { $sum: { $cond: [{ $eq: ['$type', 'command'] }, 1, 0] } },
            messages: { $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Activity.aggregate([
        { $match: { guildId, createdAt: { $gte: cutoff } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      period: days,
      totalActivities: activities.length,
      breakdown: {
        commands: activities.filter(a => a.type === 'command').length,
        messages: activities.filter(a => a.type === 'message').length,
        shifts: activities.filter(a => a.type === 'shift').length,
        warnings: activities.filter(a => a.type === 'warning').length
      },
      topCommands: commandStats.map(c => ({ command: c._id, uses: c.count })),
      activityByDay: activityByDay.map(d => ({
        date: d._id,
        total: d.count,
        commands: d.commands,
        messages: d.messages
      })),
      topUsers: topUsers.map(u => ({ userId: u._id, activities: u.count }))
    };
  }

  async getRealTimeMetrics(guildId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentActivity, hourlyActivity, dailyActivity, currentShifts] = await Promise.all([
      Activity.countDocuments({ guildId, createdAt: { $gte: fiveMinutesAgo } }),
      Activity.countDocuments({ guildId, createdAt: { $gte: oneHourAgo } }),
      Activity.countDocuments({ guildId, createdAt: { $gte: oneDayAgo } }),
      Shift.countDocuments({ guildId, endTime: null })
    ]);

    return {
      online: {
        activeNow: recentActivity,
        lastHour: hourlyActivity,
        lastDay: dailyActivity
      },
      shifts: {
        active: currentShifts
      },
      timestamp: new Date().toISOString()
    };
  }

  async getPerformanceMetrics(guildId) {
    const { User, Shift, Warning } = require('../database/mongo');

    const [staffStats, shiftStats, warningStats] = await Promise.all([
      User.aggregate([
        { $match: { 'guilds.guildId': guildId } },
        {
          $project: {
            guildData: {
              $filter: {
                input: '$guilds',
                cond: { $eq: ['$$this.guildId', guildId] }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalStaff: { $sum: 1 },
            avgPoints: { $avg: { $arrayElemAt: ['$guildData.staff.points', 0] } },
            totalPoints: { $sum: { $arrayElemAt: ['$guildData.staff.points', 0] } }
          }
        }
      ]),
      Shift.aggregate([
        { $match: { guildId, endTime: { $ne: null } } },
        {
          $group: {
            _id: null,
            totalShifts: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            avgDuration: { $avg: '$duration' }
          }
        }
      ]),
      Warning.aggregate([
        { $match: { guildId } },
        {
          $group: {
            _id: null,
            totalWarnings: { $sum: 1 },
            bySeverity: {
              $push: '$severity'
            }
          }
        }
      ])
    ]);

    return {
      staff: staffStats[0] || { totalStaff: 0, avgPoints: 0, totalPoints: 0 },
      shifts: shiftStats[0] || { totalShifts: 0, totalDuration: 0, avgDuration: 0 },
      warnings: warningStats[0] || { totalWarnings: 0, bySeverity: [] }
    };
  }

  async generateComparisonReport(guildId, compareGuildId, days = 7) {
    const [guild1Stats, guild2Stats] = await Promise.all([
      this.getDashboardStats(guildId, days),
      this.getDashboardStats(compareGuildId, days)
    ]);

    return {
      period: days,
      guild1: {
        guildId,
        totalActivities: guild1Stats.totalActivities,
        breakdown: guild1Stats.breakdown
      },
      guild2: {
        guildId: compareGuildId,
        totalActivities: guild2Stats.totalActivities,
        breakdown: guild2Stats.breakdown
      },
      comparison: {
        activityRatio: guild2Stats.totalActivities > 0
          ? (guild1Stats.totalActivities / guild2Stats.totalActivities).toFixed(2)
          : 'N/A',
        commandRatio: guild2Stats.breakdown.commands > 0
          ? (guild1Stats.breakdown.commands / guild2Stats.breakdown.commands).toFixed(2)
          : 'N/A',
        winner: guild1Stats.totalActivities > guild2Stats.totalActivities ? guildId : compareGuildId
      }
    };
  }
}

module.exports = AnalyticsSystem;
