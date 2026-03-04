const express = require('express');
const router = express.Router();
const { Guild, User, Shift, Warning, Activity, Ticket, License } = require('../database/mongo');
const logger = require('../utils/logger');

const MANAGE_GUILD = 0x20;

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const r = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: header }
    });
    if (!r.ok) return res.status(401).json({ error: 'Invalid token' });
    req.discordUser = await r.json();
    req.token = header.split(' ')[1];
    next();
  } catch { res.status(401).json({ error: 'Auth failed' }); }
}

async function guildAuth(req, res, next) {
  const { guildId } = req.params;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  try {
    const r = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.token}` }
    });
    if (!r.ok) return res.status(401).json({ error: 'Cannot fetch guilds' });
    const guilds = await r.json();
    const guild = guilds.find(g => g.id === guildId);
    if (!guild) return res.status(403).json({ error: 'Not in this server' });
    if (!(guild.permissions & MANAGE_GUILD) && !guild.owner) return res.status(403).json({ error: 'Need Manage Server permission' });
    req.discordGuild = guild;
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}

function superAdminAuth(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.SUPER_ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════
// REAL-TIME ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/analytics/overview', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    const daysNum = Math.min(parseInt(days) || 7, 90);
    const cutoff = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const [
      guildDb,
      totalStaff,
      activeStaff,
      totalShifts,
      totalWarnings,
      recentActivities,
      ticketsResolved,
      ticketsOpen
    ] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      User.countDocuments({ 'guilds': { $elemMatch: { guildId, 'staff.rank': { $exists: true } } } }),
      User.countDocuments({ 'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } } }),
      Shift.countDocuments({ guildId, endTime: { $ne: null } }),
      Warning.countDocuments({ guildId }),
      Activity.find({ guildId, createdAt: { $gte: cutoff } }).sort({ createdAt: -1 }).limit(100).lean(),
      Ticket.countDocuments({ guildId, status: 'closed' }),
      Ticket.countDocuments({ guildId, status: 'open' })
    ]);

    const activityBreakdown = {
      commands: recentActivities.filter(a => a.type === 'command').length,
      messages: recentActivities.filter(a => a.type === 'message').length,
      shifts: recentActivities.filter(a => a.type === 'shift').length,
      warnings: recentActivities.filter(a => a.type === 'warning').length
    };

    const dailyActivity = {};
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyActivity[date] = recentActivities.filter(a => a.createdAt.toISOString().startsWith(date)).length;
    }

    res.json({
      period: daysNum,
      summary: {
        totalStaff,
        activeStaff,
        totalShifts,
        totalWarnings,
        ticketsResolved,
        ticketsOpen,
        totalActivities: recentActivities.length
      },
      activityBreakdown,
      dailyActivity,
      tier: guildDb?.premium?.tier || 'free',
      premiumActive: guildDb?.premium?.isActive || false
    });
  } catch (e) {
    logger.error('Analytics overview error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/analytics/heatmap', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: cutoff }
    }).lean();

    const heatmap = Array(7).fill(null).map((_, day) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      hours: Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }))
    }));

    activities.forEach(a => {
      const date = new Date(a.createdAt);
      const day = date.getDay();
      const hour = date.getHours();
      heatmap[day].hours[hour].count++;
    });

    res.json({ heatmap, totalActivities: activities.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/analytics/staff-performance', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { limit = 20 } = req.query;

    const users = await User.find({
      'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } }
    }).limit(parseInt(limit)).lean();

    const performanceData = await Promise.all(users.map(async u => {
      const guildEntry = u.guilds.find(g => g.guildId === guildId);
      const staff = guildEntry?.staff || {};

      const [shifts, warnings, recentActivity] = await Promise.all([
        Shift.countDocuments({ userId: u.userId, guildId }),
        Warning.countDocuments({ userId: u.userId, guildId }),
        Activity.countDocuments({ userId: u.userId, guildId, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      ]);

      const productivityScore = Math.min(100, Math.round(
        (staff.points || 0) * 0.3 +
        (shifts * 10) * 0.3 +
        (staff.consistency || 0) * 0.2 +
        (recentActivity * 2) * 0.2
      ));

      return {
        userId: u.userId,
        username: u.username || 'Unknown',
        avatar: u.avatar,
        rank: staff.rank || 'member',
        points: staff.points || 0,
        shifts,
        warnings,
        consistency: staff.consistency || 0,
        recentActivity,
        productivityScore,
        lastActive: staff.lastShift || null
      };
    }));

    res.json(performanceData.sort((a, b) => b.productivityScore - a.productivityScore));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BULK OPERATIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.post('/guild/:guildId/bulk/points', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userIds, points, reason, operation = 'add' } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 100) {
      return res.status(400).json({ error: 'Invalid userIds array (1-100 users)' });
    }

    if (typeof points !== 'number' || points <= 0 || points > 10000) {
      return res.status(400).json({ error: 'Invalid points value' });
    }

    const results = [];
    const failed = [];

    for (const userId of userIds) {
      try {
        const user = await User.findOne({ userId, 'guilds.guildId': guildId });
        if (!user) {
          failed.push({ userId, reason: 'User not found in guild' });
          continue;
        }

        const updateValue = operation === 'remove' ? -points : points;
        await User.findOneAndUpdate(
          { userId, 'guilds.guildId': guildId },
          { $inc: { 'guilds.$.staff.points': updateValue } }
        );

        await Activity.create({
          guildId,
          userId,
          type: 'bulk_points',
          data: { points: updateValue, reason, operation, by: req.discordUser.id }
        });

        results.push({ userId, pointsUpdated: updateValue });
      } catch (err) {
        failed.push({ userId, reason: err.message });
      }
    }

    res.json({ success: true, updated: results.length, results, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/guild/:guildId/bulk/rank', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userIds, rank, reason } = req.body;

    const validRanks = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
    if (!validRanks.includes(rank)) {
      return res.status(400).json({ error: 'Invalid rank' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 50) {
      return res.status(400).json({ error: 'Invalid userIds array (1-50 users)' });
    }

    const results = [];
    const failed = [];

    for (const userId of userIds) {
      try {
        await User.findOneAndUpdate(
          { userId, 'guilds.guildId': guildId },
          {
            $set: {
              'guilds.$.staff.rank': rank,
              'guilds.$.staff.lastPromotionDate': new Date()
            }
          }
        );

        await Activity.create({
          guildId,
          userId,
          type: 'bulk_rank',
          data: { rank, reason, by: req.discordUser.id }
        });

        results.push({ userId, newRank: rank });
      } catch (err) {
        failed.push({ userId, reason: err.message });
      }
    }

    res.json({ success: true, updated: results.length, results, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// EXPORT FUNCTIONALITY ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/export/staff', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { format = 'json' } = req.query;

    const users = await User.find({
      'guilds': { $elemMatch: { guildId, 'staff.rank': { $exists: true } } }
    }).lean();

    const staffData = await Promise.all(users.map(async u => {
      const guildEntry = u.guilds.find(g => g.guildId === guildId);
      const staff = guildEntry?.staff || {};

      const [shifts, warnings] = await Promise.all([
        Shift.countDocuments({ userId: u.userId, guildId }),
        Warning.countDocuments({ userId: u.userId, guildId })
      ]);

      return {
        userId: u.userId,
        username: u.username,
        globalName: u.globalName,
        rank: staff.rank,
        points: staff.points || 0,
        shifts,
        warnings,
        consistency: staff.consistency || 0,
        streak: staff.streak || 0,
        reputation: staff.reputation || 0,
        achievements: (staff.achievements || []).join(', '),
        joinedAt: guildEntry?.joinedAt
      };
    }));

    if (format === 'csv') {
      const headers = Object.keys(staffData[0] || {}).join(',');
      const rows = staffData.map(row => Object.values(row).map(v => `"${v}"`).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="staff-${guildId}.csv"`);
      return res.send(csv);
    }

    res.json({ exported: staffData.length, data: staffData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/export/shifts', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    const query = { guildId, endTime: { $ne: null } };
    if (startDate) query.startTime = { $gte: new Date(startDate) };
    if (endDate) query.endTime = { $lte: new Date(endDate) };

    const shifts = await Shift.find(query).sort({ startTime: -1 }).lean();

    const shiftData = shifts.map(s => ({
      userId: s.userId,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration || 0,
      durationFormatted: s.duration ? `${Math.floor(s.duration / 3600)}h ${Math.floor((s.duration % 3600) / 60)}m` : 'N/A',
      pointsEarned: s.duration ? Math.floor(s.duration / 300) : 0,
      notes: s.notes || '',
      status: s.status
    }));

    if (format === 'csv') {
      const headers = Object.keys(shiftData[0] || {}).join(',');
      const rows = shiftData.map(row => Object.values(row).map(v => `"${v}"`).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="shifts-${guildId}.csv"`);
      return res.send(csv);
    }

    res.json({ exported: shiftData.length, data: shiftData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SUPER ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/admin/overview', superAdminAuth, async (req, res) => {
  try {
    const [
      totalGuilds,
      totalUsers,
      totalLicenses,
      activeLicenses,
      totalTickets,
      totalShifts,
      totalWarnings
    ] = await Promise.all([
      Guild.countDocuments(),
      User.countDocuments(),
      License.countDocuments(),
      License.countDocuments({ status: 'active' }),
      Ticket.countDocuments(),
      Shift.countDocuments(),
      Warning.countDocuments()
    ]);

    const tierDistribution = await Guild.aggregate([
      { $group: { _id: '$premium.tier', count: { $sum: 1 } } }
    ]);

    const recentGuilds = await Guild.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('guildId name premium.tier createdAt')
      .lean();

    res.json({
      overview: {
        totalGuilds,
        totalUsers,
        totalLicenses,
        activeLicenses,
        totalTickets,
        totalShifts,
        totalWarnings
      },
      tierDistribution: tierDistribution.reduce((acc, t) => {
        acc[t._id || 'free'] = t.count;
        return acc;
      }, {}),
      recentGuilds
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/guilds', superAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, tier, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (tier) query['premium.tier'] = tier;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { guildId: { $regex: search, $options: 'i' } }
      ];
    }

    const [guilds, total] = await Promise.all([
      Guild.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Guild.countDocuments(query)
    ]);

    res.json({
      guilds: guilds.map(g => ({
        guildId: g.guildId,
        name: g.name,
        tier: g.premium?.tier || 'free',
        isActive: g.premium?.isActive || false,
        memberCount: g.memberCount,
        createdAt: g.createdAt,
        stats: g.stats
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/admin/guilds/:guildId/premium', superAdminAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { tier, isActive, expiresAt } = req.body;

    const update = {};
    if (tier) update['premium.tier'] = tier;
    if (typeof isActive === 'boolean') update['premium.isActive'] = isActive;
    if (expiresAt) update['premium.expiresAt'] = new Date(expiresAt);

    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: update },
      { new: true }
    );

    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    res.json({ success: true, guild: { guildId, premium: guild.premium } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/admin/guilds/:guildId', superAdminAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { purgeData = false } = req.body;

    if (purgeData) {
      await Promise.all([
        Shift.deleteMany({ guildId }),
        Warning.deleteMany({ guildId }),
        Ticket.deleteMany({ guildId }),
        Activity.deleteMany({ guildId }),
        License.deleteMany({ guildId })
      ]);
    }

    await Guild.deleteOne({ guildId });

    res.json({ success: true, message: `Guild ${guildId} deleted. Data purged: ${purgeData}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/users/:userId', superAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const guilds = await Guild.find({
      guildId: { $in: user.guilds.map(g => g.guildId) }
    }).select('guildId name premium.tier').lean();

    const guildMap = new Map(guilds.map(g => [g.guildId, g]));

    res.json({
      userId: user.userId,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      staff: user.staff,
      guilds: user.guilds.map(g => ({
        ...g,
        guildName: guildMap.get(g.guildId)?.name || 'Unknown',
        tier: guildMap.get(g.guildId)?.premium?.tier || 'free'
      })),
      stats: user.stats
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SERVER MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.post('/guild/:guildId/purge', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, olderThanDays, userId } = req.body;

    const cutoff = olderThanDays ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) : null;
    const query = { guildId };
    if (cutoff) query.createdAt = { $lt: cutoff };
    if (userId) query.userId = userId;

    let result;
    switch (type) {
      case 'warnings':
        result = await Warning.deleteMany(query);
        break;
      case 'activities':
        result = await Activity.deleteMany(query);
        break;
      case 'shifts':
        query.endTime = { $ne: null };
        result = await Shift.deleteMany(query);
        break;
      default:
        return res.status(400).json({ error: 'Invalid purge type' });
    }

    await Activity.create({
      guildId,
      userId: req.discordUser.id,
      type: 'purge',
      data: { type, deleted: result.deletedCount, criteria: { olderThanDays, userId } }
    });

    res.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/compare', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { compareGuildId } = req.query;

    if (!compareGuildId) return res.status(400).json({ error: 'compareGuildId required' });

    const [guild1, guild2] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Guild.findOne({ guildId: compareGuildId }).lean()
    ]);

    if (!guild1 || !guild2) return res.status(404).json({ error: 'One or both guilds not found' });

    const [stats1, stats2] = await Promise.all([
      getGuildStats(guildId),
      getGuildStats(compareGuildId)
    ]);

    res.json({
      guild1: { guildId, name: guild1.name, stats: stats1 },
      guild2: { guildId: compareGuildId, name: guild2.name, stats: stats2 },
      comparison: {
        staffRatio: stats2.totalStaff > 0 ? (stats1.totalStaff / stats2.totalStaff).toFixed(2) : 'N/A',
        activityRatio: stats2.totalActivities > 0 ? (stats1.totalActivities / stats2.totalActivities).toFixed(2) : 'N/A',
        productivityDiff: stats1.avgProductivity - stats2.avgProductivity
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getGuildStats(guildId) {
  const [totalStaff, totalShifts, totalWarnings, totalActivities] = await Promise.all([
    User.countDocuments({ 'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } } }),
    Shift.countDocuments({ guildId, endTime: { $ne: null } }),
    Warning.countDocuments({ guildId }),
    Activity.countDocuments({ guildId, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
  ]);

  return { totalStaff, totalShifts, totalWarnings, totalActivities, avgProductivity: totalStaff > 0 ? Math.round(totalShifts / totalStaff * 10) : 0 };
}

module.exports = router;
