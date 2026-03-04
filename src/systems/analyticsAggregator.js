const { UserStats, Guild, Shift, Warning, Ticket } = require('../database/mongo');
const { ModerationLog, Promotion } = require('../models');
const logger = require('../utils/logger');

class AnalyticsAggregator {
  constructor(client) {
    this.client = client;
  }

  async initialize() {
    logger.info('[Analytics] Aggregator initialized');
    return this;
  }

  async getGuildOverview(guildId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      staffStats,
      activityStats,
      moderationStats,
      promotionStats,
      engagementMetrics
    ] = await Promise.all([
      this.getStaffStats(guildId, since),
      this.getActivityStats(guildId, since),
      this.getModerationStats(guildId, since),
      this.getPromotionStats(guildId, since),
      this.getEngagementMetrics(guildId, since)
    ]);

    return {
      period: days,
      staff: staffStats,
      activity: activityStats,
      moderation: moderationStats,
      promotions: promotionStats,
      engagement: engagementMetrics
    };
  }

  async getStaffStats(guildId, since) {
    const totalStaff = await UserStats.countDocuments({ guildId });
    
    const rankDistribution = await UserStats.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$staff.rank',
          count: { $sum: 1 }
        }
      }
    ]);

    const activeStaff = await Shift.distinct('userId', {
      guildId,
      startTime: { $gte: since }
    });

    const topPerformers = await UserStats.find({ guildId })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .select('userId staff.points staff.rank staff.shifts')
      .lean();

    const avgStats = await UserStats.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          avgPoints: { $avg: '$staff.points' },
          avgShifts: { $avg: '$staff.shifts' },
          avgConsistency: { $avg: '$staff.consistency' }
        }
      }
    ]);

    return {
      total: totalStaff,
      active: activeStaff.length,
      inactive: totalStaff - activeStaff.length,
      activityRate: totalStaff > 0 ? Math.round((activeStaff.length / totalStaff) * 100) : 0,
      rankDistribution: rankDistribution.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
      topPerformers: await Promise.all(topPerformers.map(async (p) => {
        const user = await this.client.users.fetch(p.userId).catch(() => null);
        return {
          userId: p.userId,
          username: user?.username || 'Unknown',
          points: p.staff.points,
          rank: p.staff.rank,
          shifts: p.staff.shifts
        };
      })),
      averages: avgStats[0] || { avgPoints: 0, avgShifts: 0, avgConsistency: 0 }
    };
  }

  async getActivityStats(guildId, since) {
    const shifts = await Shift.aggregate([
      { $match: { guildId, startTime: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            day: { $dayOfMonth: '$startTime' }
          },
          count: { $sum: 1 },
          totalMinutes: { $sum: '$duration' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    const totalShifts = shifts.reduce((sum, s) => sum + s.count, 0);
    const totalMinutes = shifts.reduce((sum, s) => sum + s.totalMinutes, 0);

    const hourlyDistribution = await Shift.aggregate([
      { $match: { guildId, startTime: { $gte: since } } },
      {
        $group: {
          _id: { $hour: '$startTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalShifts,
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      averageShiftLength: totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0,
      dailyTrend: shifts.map(s => ({
        date: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')}`,
        shifts: s.count,
        minutes: s.totalMinutes
      })),
      hourlyDistribution: hourlyDistribution.reduce((acc, h) => {
        acc[h._id] = h.count;
        return acc;
      }, {})
    };
  }

  async getModerationStats(guildId, since) {
    const actions = await ModerationLog.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    const severityDistribution = await ModerationLog.aggregate([
      { $match: { guildId, createdAt: { $gte: since }, severity: { $exists: true } } },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const topModerators = await ModerationLog.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$moderatorId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const dailyTrend = await ModerationLog.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    return {
      totalActions: actions.reduce((sum, a) => sum + a.count, 0),
      byAction: actions.reduce((acc, a) => {
        acc[a._id] = a.count;
        return acc;
      }, {}),
      bySeverity: severityDistribution.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      topModerators: await Promise.all(topModerators.map(async (m) => {
        const user = await this.client.users.fetch(m._id).catch(() => null);
        return {
          userId: m._id,
          username: user?.username || 'Unknown',
          actions: m.count
        };
      })),
      dailyTrend: dailyTrend.map(d => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        count: d.count
      }))
    };
  }

  async getPromotionStats(guildId, since) {
    const promotions = await Promotion.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$toRank',
          count: { $sum: 1 }
        }
      }
    ]);

    const promotionType = await Promotion.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$promotionType',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyTrend = await Promotion.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    return {
      totalPromotions: promotions.reduce((sum, p) => sum + p.count, 0),
      byRank: promotions.reduce((acc, p) => {
        acc[p._id] = p.count;
        return acc;
      }, {}),
      byType: promotionType.reduce((acc, p) => {
        acc[p._id] = p.count;
        return acc;
      }, {}),
      monthlyTrend: monthlyTrend.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        count: m.count
      }))
    };
  }

  async getEngagementMetrics(guildId, since) {
    const userStats = await UserStats.find({ guildId }).lean();

    const totalMessages = userStats.reduce((sum, u) => sum + (u.messages?.total || 0), 0);
    const totalVoiceMinutes = userStats.reduce((sum, u) => sum + (u.voice?.totalMinutes || 0), 0);

    const xpDistribution = await UserStats.aggregate([
      { $match: { guildId } },
      {
        $bucket: {
          groupBy: '$xp.level',
          boundaries: [1, 5, 10, 20, 50, 100],
          default: '100+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const retentionData = await this.calculateRetention(guildId, since);

    return {
      totalMessages,
      totalVoiceHours: Math.round(totalVoiceMinutes / 60 * 100) / 100,
      averageMessagesPerUser: userStats.length > 0 ? Math.round(totalMessages / userStats.length) : 0,
      xpDistribution: xpDistribution.map(d => ({
        range: d._id === '100+' ? '100+' : `${d._id}-${d._id + 4}`,
        count: d.count
      })),
      retention: retentionData
    };
  }

  async calculateRetention(guildId, since) {
    const activeUsers = await Shift.distinct('userId', {
      guildId,
      startTime: { $gte: since }
    });

    const allUsers = await UserStats.distinct('userId', { guildId });

    return {
      total: allUsers.length,
      active: activeUsers.length,
      churned: allUsers.length - activeUsers.length,
      retentionRate: allUsers.length > 0
        ? Math.round((activeUsers.length / allUsers.length) * 100)
        : 0
    };
  }

  async getComparisonData(guildId, metric = 'points', days = 30) {
    const currentSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

    let currentValue, previousValue;

    switch (metric) {
      case 'points':
        currentValue = await this.getTotalPoints(guildId, currentSince);
        previousValue = await this.getTotalPoints(guildId, previousSince, currentSince);
        break;
      case 'shifts':
        currentValue = await Shift.countDocuments({ guildId, startTime: { $gte: currentSince } });
        previousValue = await Shift.countDocuments({
          guildId,
          startTime: { $gte: previousSince, $lt: currentSince }
        });
        break;
      case 'warnings':
        currentValue = await ModerationLog.countDocuments({ guildId, createdAt: { $gte: currentSince } });
        previousValue = await ModerationLog.countDocuments({
          guildId,
          createdAt: { $gte: previousSince, $lt: currentSince }
        });
        break;
      default:
        throw new Error('Unknown metric');
    }

    const change = previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0;

    return {
      metric,
      current: currentValue,
      previous: previousValue,
      change: Math.round(change * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }

  async getTotalPoints(guildId, since, until = null) {
    const match = { guildId };
    if (since) match.updatedAt = { $gte: since };
    if (until) match.updatedAt = { ...match.updatedAt, $lt: until };

    const result = await UserStats.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$staff.points' }
        }
      }
    ]);

    return result[0]?.total || 0;
  }

  async exportReport(guildId, format = 'json', days = 30) {
    const data = await this.getGuildOverview(guildId, days);

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        throw new Error('Unsupported format');
    }
  }

  convertToCSV(data) {
    // Simplified CSV conversion for staff data
    const rows = [];
    rows.push('Metric,Value');
    
    rows.push(`Total Staff,${data.staff.total}`);
    rows.push(`Active Staff,${data.staff.active}`);
    rows.push(`Total Shifts,${data.activity.totalShifts}`);
    rows.push(`Total Hours,${data.activity.totalHours}`);
    rows.push(`Total Messages,${data.engagement.totalMessages}`);

    return rows.join('\n');
  }
}

module.exports = AnalyticsAggregator;
