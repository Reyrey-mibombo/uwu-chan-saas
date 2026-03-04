const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Guild, User, Activity, License } = require('../database/mongo');
const logger = require('../utils/logger');
const os = require('os');

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/health', async (req, res) => {
  try {
    const client = req.app.locals.client;
    const uptime = process.uptime();

    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    // Check Discord connection
    const discordStatus = client?.ws?.status === 0 ? 'connected' : 'disconnected';
    const guildCount = client?.guilds?.cache?.size || 0;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // Calculate health score
    let healthScore = 100;
    if (dbStatus !== 'connected') healthScore -= 40;
    if (discordStatus !== 'connected') healthScore -= 40;
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) healthScore -= 10;

    const status = healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy';

    res.status(healthScore >= 50 ? 200 : 503).json({
      status,
      healthScore,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '8.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      services: {
        database: {
          status: dbStatus,
          state: dbState
        },
        discord: {
          status: discordStatus,
          guilds: guildCount,
          ping: client?.ws?.ping || null
        }
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          rss: formatBytes(memoryUsage.rss),
          external: formatBytes(memoryUsage.external)
        },
        systemMemory: {
          total: formatBytes(systemMemory.total),
          free: formatBytes(systemMemory.free),
          used: formatBytes(systemMemory.used),
          usagePercent: Math.round((systemMemory.used / systemMemory.total) * 100)
        },
        cpu: {
          loadAvg: os.loadavg(),
          count: os.cpus().length
        }
      }
    });
  } catch (e) {
    logger.error('Health check error:', e);
    res.status(503).json({ status: 'error', error: e.message });
  }
});

router.get('/health/detailed', async (req, res) => {
  try {
    const client = req.app.locals.client;
    const startTime = Date.now();

    // Database latency test
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const dbLatency = Date.now() - dbStart;

    // Query performance tests
    const queryStart = Date.now();
    await Promise.all([
      Guild.countDocuments(),
      User.countDocuments(),
      Activity.findOne().sort({ createdAt: -1 })
    ]);
    const queryLatency = Date.now() - queryStart;

    // Discord latency
    const discordPing = client?.ws?.ping || null;

    // Calculate response time
    const responseTime = Date.now() - startTime;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latencies: {
        database: dbLatency,
        queries: queryLatency,
        discord: discordPing,
        total: responseTime
      },
      performance: {
        dbLatency: dbLatency < 100 ? 'excellent' : dbLatency < 500 ? 'good' : 'poor',
        queryLatency: queryLatency < 500 ? 'excellent' : queryLatency < 2000 ? 'good' : 'poor'
      }
    });
  } catch (e) {
    logger.error('Detailed health check error:', e);
    res.status(503).json({ status: 'error', error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// MONITORING & METRICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/metrics', async (req, res) => {
  try {
    const client = req.app.locals.client;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalGuilds,
      totalUsers,
      activeGuilds24h,
      totalCommands,
      newUsers24h,
      premiumGuilds,
      licenseDistribution
    ] = await Promise.all([
      Guild.countDocuments(),
      User.countDocuments(),
      Guild.countDocuments({ 'stats.lastActivity': { $gte: twentyFourHoursAgo } }),
      Activity.countDocuments({ type: 'command' }),
      User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      Guild.countDocuments({ 'premium.isActive': true }),
      License.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$tier', count: { $sum: 1 } } }
      ])
    ]);

    const commandStats = await Activity.aggregate([
      { $match: { type: 'command', createdAt: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$data.command', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const dailyGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      overview: {
        totalGuilds,
        totalUsers,
        activeGuilds24h,
        totalCommands,
        newUsers24h,
        premiumGuilds,
        conversionRate: totalGuilds > 0 ? ((premiumGuilds / totalGuilds) * 100).toFixed(2) : 0
      },
      licenseDistribution: licenseDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topCommands: commandStats.map(c => ({ command: c._id, uses: c.count })),
      dailyGrowth: dailyGrowth.map(d => ({ date: d._id, newUsers: d.count })),
      discord: client ? {
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        ping: client.ws.ping
      } : null
    });
  } catch (e) {
    logger.error('Metrics error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/metrics/guilds', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const guilds = await Guild.find()
      .sort({ 'stats.commandsUsed': -1 })
      .limit(parseInt(limit))
      .select('guildId name stats premium.tier createdAt')
      .lean();

    const client = req.app.locals.client;

    const enrichedGuilds = guilds.map(g => {
      const discordGuild = client?.guilds?.cache?.get(g.guildId);
      return {
        guildId: g.guildId,
        name: g.name,
        tier: g.premium?.tier || 'free',
        memberCount: discordGuild?.memberCount || null,
        commandsUsed: g.stats?.commandsUsed || 0,
        messagesProcessed: g.stats?.messagesProcessed || 0,
        warnings: g.stats?.warnings || 0,
        createdAt: g.createdAt,
        lastActivity: g.stats?.lastActivity
      };
    });

    res.json({
      guilds: enrichedGuilds,
      totals: {
        commandsUsed: guilds.reduce((sum, g) => sum + (g.stats?.commandsUsed || 0), 0),
        messagesProcessed: guilds.reduce((sum, g) => sum + (g.stats?.messagesProcessed || 0), 0),
        warnings: guilds.reduce((sum, g) => sum + (g.stats?.warnings || 0), 0)
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BOT STATISTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/bot/stats', async (req, res) => {
  try {
    const client = req.app.locals.client;

    const stats = {
      commands: {
        total: 271,
        categories: {
          v1: 35,
          v2: 45,
          v3: 40,
          v4: 38,
          v5: 35,
          v6: 32,
          v7: 28,
          v8: 18
        }
      },
      features: {
        staffManagement: true,
        moderation: true,
        ticketing: true,
        analytics: true,
        automation: true,
        applications: true,
        promotions: true,
        licensing: true
      },
      version: '8.0.0',
      tiers: ['free', 'premium', 'enterprise']
    };

    if (client) {
      stats.discord = {
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        uptime: formatUptime(process.uptime()),
        ping: client.ws.ping
      };
    }

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/bot/commands', async (req, res) => {
  try {
    const client = req.app.locals.client;
    const commands = [];

    if (client?.commands) {
      for (const [name, command] of client.commands) {
        commands.push({
          name,
          description: command.data?.description || 'No description',
          category: command.requiredVersion || 'unknown',
          cooldown: command.cooldown || 3
        });
      }
    }

    res.json({
      total: commands.length,
      commands: commands.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// REAL-TIME STATUS ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/status/live', async (req, res) => {
  try {
    const client = req.app.locals.client;

    const [
      totalGuilds,
      totalUsers,
      activeLicenses,
      recentActivities
    ] = await Promise.all([
      Guild.countDocuments(),
      User.countDocuments(),
      License.countDocuments({ status: 'active' }),
      Activity.countDocuments({ createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } })
    ]);

    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      stats: {
        totalGuilds,
        totalUsers,
        activeLicenses,
        recentActivities
      },
      discord: client ? {
        status: client.ws.status === 0 ? 'connected' : 'connecting',
        ping: client.ws.ping,
        guilds: client.guilds.cache.size
      } : null
    });
  } catch (e) {
    res.status(503).json({ status: 'error', error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BACKUP & DATA ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get('/guild/:guildId/backup/metadata', async (req, res) => {
  try {
    const { guildId } = req.params;
    const apiSecret = req.headers['x-api-secret'];

    if (apiSecret !== process.env.API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [
      guild,
      staffCount,
      shiftCount,
      warningCount,
      ticketCount,
      activityCount
    ] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      User.countDocuments({ 'guilds': { $elemMatch: { guildId } } }),
      Shift.countDocuments({ guildId }),
      Warning.countDocuments({ guildId }),
      Ticket.countDocuments({ guildId }),
      Activity.countDocuments({ guildId })
    ]);

    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    res.json({
      guildId,
      name: guild.name,
      backupSize: {
        staff: staffCount,
        shifts: shiftCount,
        warnings: warningCount,
        tickets: ticketCount,
        activities: activityCount,
        estimatedSizeKB: Math.round((staffCount + shiftCount + warningCount + ticketCount + activityCount) * 0.5)
      },
      settings: {
        premium: guild.premium,
        modules: guild.settings?.modules,
        rankRoles: guild.rankRoles
      },
      lastBackup: guild.stats?.lastBackup || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
