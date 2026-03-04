const express = require('express');
const router = express.Router();
const { Guild, User, Shift, Warning, Activity, Ticket, License, ApplicationRequest } = require('../database/mongo');
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

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION & PAYMENT MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/subscription', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const [guild, licenses] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      License.find({ guildId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const activeLicense = licenses.find(l => l.status === 'active');
    const now = new Date();
    const expiresAt = guild.premium?.expiresAt ? new Date(guild.premium.expiresAt) : null;
    const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)) : 0;

    res.json({
      currentTier: guild.premium?.tier || 'free',
      isActive: guild.premium?.isActive || false,
      activatedAt: guild.premium?.activatedAt,
      expiresAt: guild.premium?.expiresAt,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      paymentProvider: guild.premium?.paymentProvider || null,
      licenseHistory: licenses.map(l => ({
        key: l.key,
        tier: l.tier,
        status: l.status,
        createdAt: l.createdAt,
        activatedAt: l.activatedAt,
        expiresAt: l.expiresAt,
        provider: l.paymentProvider
      })),
      activeLicense: activeLicense ? {
        key: activeLicense.key,
        tier: activeLicense.tier,
        expiresAt: activeLicense.expiresAt
      } : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/invoices', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const licenses = await License.find({ guildId })
      .sort({ createdAt: -1 })
      .select('key tier status paymentProvider paymentId createdAt activatedAt expiresAt')
      .lean();

    const invoices = licenses.map(l => ({
      id: l.paymentId || l.key,
      licenseKey: l.key,
      tier: l.tier,
      status: l.status,
      provider: l.paymentProvider,
      amount: getTierPrice(l.tier),
      currency: 'USD',
      createdAt: l.createdAt,
      activatedAt: l.activatedAt,
      expiresAt: l.expiresAt
    }));

    res.json({ invoices, totalSpent: invoices.reduce((sum, inv) => sum + inv.amount, 0) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function getTierPrice(tier) {
  const prices = { premium: 9.99, enterprise: 29.99 };
  return prices[tier] || 0;
}

router.post('/guild/:guildId/cancel-subscription', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { atPeriodEnd = true } = req.body;

    const guild = await Guild.findOne({ guildId }).lean();
    if (!guild?.premium?.isActive) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    await License.findOneAndUpdate(
      { guildId, status: 'active' },
      { status: atPeriodEnd ? 'pending_cancellation' : 'cancelled' }
    );

    await Activity.create({
      guildId,
      userId: req.discordUser.id,
      type: 'subscription_cancelled',
      data: { atPeriodEnd, tier: guild.premium.tier }
    });

    res.json({
      success: true,
      message: atPeriodEnd
        ? 'Subscription will cancel at period end'
        : 'Subscription cancelled immediately'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// AUDIT LOG ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/audit-logs', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, userId, limit = 50, page = 1 } = req.query;

    const query = { guildId };
    if (type) query.type = type;
    if (userId) query.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(query)
    ]);

    const enrichedLogs = await Promise.all(logs.map(async log => {
      const user = await User.findOne({ userId: log.userId }).select('username avatar').lean();
      return {
        id: log._id,
        userId: log.userId,
        username: user?.username || 'Unknown',
        avatar: user?.avatar,
        type: log.type,
        data: log.data || log.meta,
        createdAt: log.createdAt
      };
    }));

    res.json({
      logs: enrichedLogs,
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

router.get('/guild/:guildId/audit-logs/types', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;

    const types = await Activity.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ types: types.map(t => ({ type: t._id, count: t.count })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// APPLICATION MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/applications/requests', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    const query = { guildId };
    if (status && status !== 'all') query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      ApplicationRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ApplicationRequest.countDocuments(query)
    ]);

    res.json({
      applications: applications.map(app => ({
        id: app._id,
        userId: app.userId,
        username: app.username,
        globalName: app.globalName,
        answers: app.answers,
        status: app.status,
        reviewedBy: app.reviewedBy,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt
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

router.patch('/guild/:guildId/applications/:applicationId', auth, guildAuth, async (req, res) => {
  try {
    const { guildId, applicationId } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'accepted', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await ApplicationRequest.findOneAndUpdate(
      { _id: applicationId, guildId },
      {
        $set: {
          status,
          reviewedBy: req.discordUser.id,
          reviewedAt: new Date(),
          'meta.notes': notes
        }
      },
      { new: true }
    );

    if (!application) return res.status(404).json({ error: 'Application not found' });

    await Activity.create({
      guildId,
      userId: req.discordUser.id,
      type: 'application_reviewed',
      data: { applicationId, status, applicantId: application.userId }
    });

    res.json({ success: true, application });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// TICKET MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/tickets/detailed', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { status, category, limit = 50, page = 1 } = req.query;

    const query = { guildId };
    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ticket.countDocuments(query)
    ]);

    const enrichedTickets = await Promise.all(tickets.map(async t => {
      const user = await User.findOne({ userId: t.userId }).select('username avatar').lean();
      return {
        id: t._id,
        ticketId: t._id.toString().slice(-6).toUpperCase(),
        userId: t.userId,
        username: user?.username || t.username || 'Unknown',
        avatar: user?.avatar,
        category: t.category,
        status: t.status,
        channelId: t.channelId,
        messages: t.messages?.length || 0,
        createdAt: t.createdAt,
        closedAt: t.closedAt
      };
    }));

    const stats = await Ticket.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    res.json({
      tickets: enrichedTickets,
      stats: stats[0] || { total: 0, open: 0, closed: 0 },
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

// ═══════════════════════════════════════════════════════════
// WEBHOOK MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/webhooks', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const guildDb = await Guild.findOne({ guildId }).lean();

    if (!guildDb) return res.status(404).json({ error: 'Guild not found' });

    const webhooks = {
      payment: {
        stripe: {
          enabled: !!process.env.STRIPE_WEBHOOK_SECRET,
          endpoint: '/webhooks/stripe',
          events: ['checkout.session.completed', 'invoice.payment_failed', 'customer.subscription.deleted']
        },
        paypal: {
          enabled: !!process.env.PAYPAL_WEBHOOK_SECRET,
          endpoint: '/webhooks/paypal',
          events: ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED', 'CUSTOMER.SUBSCRIPTION.DELETED']
        }
      },
      configured: {
        stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        paypalWebhookSecret: !!process.env.PAYPAL_WEBHOOK_SECRET,
        apiSecret: !!process.env.API_SECRET
      }
    };

    res.json(webhooks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD WIDGET DATA
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/widgets/overview', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const client = req.app.locals.client;

    const [guildDb, discordGuild] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      client?.guilds?.cache?.get(guildId) || null
    ]);

    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStaff,
      activeStaff24h,
      activeStaff7d,
      totalShifts,
      openTickets,
      pendingApplications,
      recentWarnings
    ] = await Promise.all([
      User.countDocuments({ 'guilds': { $elemMatch: { guildId, 'staff.rank': { $exists: true } } } }),
      Activity.countDocuments({ guildId, createdAt: { $gte: dayAgo } }),
      Activity.countDocuments({ guildId, createdAt: { $gte: weekAgo } }),
      Shift.countDocuments({ guildId, endTime: { $ne: null } }),
      Ticket.countDocuments({ guildId, status: 'open' }),
      ApplicationRequest.countDocuments({ guildId, status: 'pending' }),
      Warning.countDocuments({ guildId, createdAt: { $gte: weekAgo } })
    ]);

    const topStaff = await User.find({ 'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } } })
      .sort({ 'guilds.staff.points': -1 })
      .limit(5)
      .select('userId username guilds')
      .lean();

    res.json({
      quickStats: {
        totalStaff,
        activeToday: activeStaff24h,
        activeThisWeek: activeStaff7d,
        totalShifts,
        openTickets,
        pendingApplications,
        recentWarnings
      },
      serverInfo: discordGuild ? {
        name: discordGuild.name,
        memberCount: discordGuild.memberCount,
        icon: discordGuild.iconURL(),
        createdAt: discordGuild.createdAt
      } : null,
      premium: {
        tier: guildDb?.premium?.tier || 'free',
        isActive: guildDb?.premium?.isActive || false,
        expiresAt: guildDb?.premium?.expiresAt
      },
      topStaff: topStaff.map(u => {
        const guildEntry = u.guilds.find(g => g.guildId === guildId);
        return {
          userId: u.userId,
          username: u.username,
          points: guildEntry?.staff?.points || 0,
          rank: guildEntry?.staff?.rank || 'member'
        };
      })
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/guild/:guildId/widgets/chart-data', auth, guildAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 14 } = req.query;

    const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: cutoff }
    }).lean();

    const shifts = await Shift.find({
      guildId,
      endTime: { $ne: null },
      startTime: { $gte: cutoff }
    }).lean();

    const dailyData = {};
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyData[date] = { date, activities: 0, shifts: 0, commands: 0 };
    }

    activities.forEach(a => {
      const date = a.createdAt.toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].activities++;
        if (a.type === 'command') dailyData[date].commands++;
      }
    });

    shifts.forEach(s => {
      const date = s.startTime.toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].shifts++;
      }
    });

    res.json({
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      summary: {
        totalActivities: activities.length,
        totalShifts: shifts.length,
        avgActivitiesPerDay: Math.round(activities.length / parseInt(days))
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
