const express = require('express');
const router = express.Router();
const { Guild, User, Warning, Shift, Ticket } = require('../database/mongo');
const { UserStats, ModerationLog, Promotion, AutoPromotionRule, Announcement } = require('../models');

// Middleware to validate guild access
const validateGuildAccess = async (req, res, next) => {
  const { guildId } = req.params;
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const guild = await req.app.locals.client.guilds.cache.get(guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Guild not found' });
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member || !member.permissions.has('Administrator')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.guild = guild;
  req.member = member;
  next();
};

// Get guild statistics
router.get('/guilds/:guildId/stats', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const [guildData, staffCount, totalPoints, warningsCount, activeShifts] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      UserStats.countDocuments({ guildId }),
      UserStats.aggregate([{ $match: { guildId } }, { $group: { _id: null, total: { $sum: '$staff.points' } } }]),
      ModerationLog.countDocuments({ guildId, action: 'warn' }),
      Shift.countDocuments({ guildId, status: 'active' })
    ]);

    const guild = req.guild;
    
    res.json({
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        premium: guildData?.premium || { tier: 'free', isActive: false }
      },
      staff: {
        count: staffCount,
        totalPoints: totalPoints[0]?.total || 0,
        activeShifts
      },
      moderation: {
        totalWarnings: warningsCount
      },
      settings: guildData?.settings || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff list
router.get('/guilds/:guildId/staff', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 20, rank, sortBy = 'points' } = req.query;
    
    const query = { guildId };
    if (rank) query['staff.rank'] = rank;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortField = sortBy === 'shifts' ? 'staff.shifts' : 'staff.points';
    
    const [staff, total] = await Promise.all([
      UserStats.find(query)
        .sort({ [sortField]: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      UserStats.countDocuments(query)
    ]);

    const staffWithUsers = await Promise.all(staff.map(async (s) => {
      const user = await req.app.locals.client.users.fetch(s.userId).catch(() => null);
      return {
        ...s,
        username: user?.username || 'Unknown',
        avatar: user?.displayAvatarURL()
      };
    }));

    res.json({
      staff: staffWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific staff member
router.get('/guilds/:guildId/staff/:userId', validateGuildAccess, async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    
    const [stats, userData, recentWarnings, recentShifts, promotions] = await Promise.all([
      UserStats.findOne({ userId, guildId }).lean(),
      User.findOne({ userId }).lean(),
      ModerationLog.find({ guildId, userId, action: 'warn' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Shift.find({ guildId, userId })
        .sort({ startTime: -1 })
        .limit(10)
        .lean(),
      Promotion.find({ guildId, userId })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    if (!stats) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const user = await req.app.locals.client.users.fetch(userId).catch(() => null);
    const member = await req.guild.members.fetch(userId).catch(() => null);

    res.json({
      userId,
      username: user?.username || 'Unknown',
      avatar: user?.displayAvatarURL(),
      joinedAt: member?.joinedAt,
      roles: member?.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color })),
      stats,
      guildData: userData?.guilds?.find(g => g.guildId === guildId),
      recentWarnings,
      recentShifts,
      promotionHistory: promotions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff member
router.patch('/guilds/:guildId/staff/:userId', validateGuildAccess, async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const { rank, points, warnings } = req.body;

    const updateData = {};
    if (rank) updateData['staff.rank'] = rank;
    if (points !== undefined) updateData['staff.points'] = points;
    if (warnings !== undefined) updateData['staff.warnings'] = warnings;

    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      { $set: updateData },
      { new: true }
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get moderation logs
router.get('/guilds/:guildId/moderation', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 20, action, userId } = req.query;
    
    const query = { guildId };
    if (action) query.action = action;
    if (userId) query.userId = userId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      ModerationLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ModerationLog.countDocuments(query)
    ]);

    const logsWithUsers = await Promise.all(logs.map(async (log) => {
      const [user, moderator] = await Promise.all([
        req.app.locals.client.users.fetch(log.userId).catch(() => null),
        req.app.locals.client.users.fetch(log.moderatorId).catch(() => null)
      ]);
      
      return {
        ...log,
        username: user?.username || 'Unknown',
        moderatorName: moderator?.username || 'Unknown'
      };
    }));

    res.json({
      logs: logsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auto-promotion rules
router.get('/guilds/:guildId/promotion-rules', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const rules = await AutoPromotionRule.find({ guildId })
      .sort({ priority: -1 })
      .lean();

    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create auto-promotion rule
router.post('/guilds/:guildId/promotion-rules', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const ruleData = req.body;

    const rule = new AutoPromotionRule({
      guildId,
      ...ruleData
    });

    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update auto-promotion rule
router.patch('/guilds/:guildId/promotion-rules/:ruleId', validateGuildAccess, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await AutoPromotionRule.findByIdAndUpdate(
      ruleId,
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete auto-promotion rule
router.delete('/guilds/:guildId/promotion-rules/:ruleId', validateGuildAccess, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await AutoPromotionRule.findByIdAndDelete(ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guild settings
router.get('/guilds/:guildId/settings', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const guildData = await Guild.findOne({ guildId }).lean();

    res.json({
      settings: guildData?.settings || {},
      channels: guildData?.channels || {},
      roles: guildData?.rankRoles || {},
      promotionRequirements: guildData?.promotionRequirements || {},
      modules: guildData?.modules || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update guild settings
router.patch('/guilds/:guildId/settings', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    const allowedUpdates = [
      'settings', 'channels', 'rankRoles', 'promotionRequirements',
      'modules', 'welcomeConfig', 'autoChatConfig', 'helperConfig'
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(guild);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics data
router.get('/guilds/:guildId/analytics', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [activityData, moderationStats, staffGrowth] = await Promise.all([
      Shift.aggregate([
        { $match: { guildId, startTime: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
            shifts: { $sum: 1 },
            totalMinutes: { $sum: '$duration' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      ModerationLog.aggregate([
        { $match: { guildId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ]),
      UserStats.countDocuments({
        guildId,
        'staff.joinedStaffAt': { $gte: since }
      })
    ]);

    const topStaff = await UserStats.find({ guildId })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .lean();

    res.json({
      period: `${days} days`,
      activity: activityData,
      moderation: moderationStats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      newStaff: staffGrowth,
      topStaff: await Promise.all(topStaff.map(async (s) => {
        const user = await req.app.locals.client.users.fetch(s.userId).catch(() => null);
        return {
          userId: s.userId,
          username: user?.username || 'Unknown',
          points: s.staff.points,
          rank: s.staff.rank
        };
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export guild data
router.get('/guilds/:guildId/export', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type = 'all' } = req.query;

    const exportData = {
      exportedAt: new Date(),
      guildId
    };

    if (type === 'all' || type === 'staff') {
      exportData.staff = await UserStats.find({ guildId }).lean();
    }

    if (type === 'all' || type === 'moderation') {
      exportData.moderation = await ModerationLog.find({ guildId }).lean();
    }

    if (type === 'all' || type === 'shifts') {
      exportData.shifts = await Shift.find({ guildId }).lean();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${guildId}_export_${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advanced analytics endpoints
router.get('/guilds/:guildId/analytics/overview', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 30 } = req.query;

    const AnalyticsAggregator = require('../systems/analyticsAggregator');
    const aggregator = new AnalyticsAggregator(req.app.locals.client);

    const data = await aggregator.getGuildOverview(guildId, parseInt(days));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/analytics/comparison', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { metric = 'points', days = 30 } = req.query;

    const AnalyticsAggregator = require('../systems/analyticsAggregator');
    const aggregator = new AnalyticsAggregator(req.app.locals.client);

    const data = await aggregator.getComparisonData(guildId, metric, parseInt(days));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/analytics/report', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { format = 'json', days = 30 } = req.query;

    const AnalyticsAggregator = require('../systems/analyticsAggregator');
    const aggregator = new AnalyticsAggregator(req.app.locals.client);

    const report = await aggregator.exportReport(guildId, format, parseInt(days));

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${guildId}_report_${Date.now()}.csv"`);
    }

    res.send(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Economy endpoints
router.get('/guilds/:guildId/economy/leaderboard', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const leaderboard = await req.app.locals.client.systems.economy?.getLeaderboard(
      guildId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/economy/wealth', validateGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;

    const wealth = await req.app.locals.client.systems.economy?.getGlobalWealth(guildId);

    res.json(wealth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cache management endpoints (owner only)
router.post('/admin/cache/clear', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || userId !== process.env.OWNER_ID) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cacheManager = require('../utils/cacheManager');
    await cacheManager.flush();

    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/cache/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || userId !== process.env.OWNER_ID) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cacheManager = require('../utils/cacheManager');
    const stats = cacheManager.getStats();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Job scheduler status (owner only)
router.get('/admin/jobs/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || userId !== process.env.OWNER_ID) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const status = req.app.locals.client.systems.scheduler?.getJobStatus();

    res.json({ jobs: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '8.1.0'
  });
});

module.exports = router;
