const cron = require('node-cron');
const logger = require('../utils/logger');
const { UserStats, Guild, Warning, Shift } = require('../database/mongo');
const { ModerationLog, AutoPromotionRule, Announcement } = require('../models');

class JobScheduler {
  constructor(client) {
    this.client = client;
    this.jobs = new Map();
    this.isRunning = false;
  }

  async initialize() {
    logger.info('[JobScheduler] Initializing job scheduler...');
    this.registerJobs();
    this.start();
    return this;
  }

  registerJobs() {
    // Daily stats aggregation - runs at midnight
    this.jobs.set('daily-stats', {
      schedule: '0 0 * * *',
      task: () => this.runDailyStatsAggregation(),
      description: 'Aggregate daily statistics'
    });

    // Weekly report generation - runs every Monday at 9 AM
    this.jobs.set('weekly-report', {
      schedule: '0 9 * * 1',
      task: () => this.runWeeklyReports(),
      description: 'Generate weekly reports'
    });

    // Cleanup expired mutes - runs every 5 minutes
    this.jobs.set('cleanup-mutes', {
      schedule: '*/5 * * * *',
      task: () => this.cleanupExpiredMutes(),
      description: 'Clean up expired mutes and bans'
    });

    // Auto-promotion check - runs every hour
    this.jobs.set('auto-promotion', {
      schedule: '0 * * * *',
      task: () => this.runAutoPromotionChecks(),
      description: 'Check for auto-promotions'
    });

    // Daily backup - runs at 3 AM
    this.jobs.set('daily-backup', {
      schedule: '0 3 * * *',
      task: () => this.runDailyBackup(),
      description: 'Create daily data backup'
    });

    // Reset daily stats - runs at midnight
    this.jobs.set('reset-daily', {
      schedule: '0 0 * * *',
      task: () => this.resetDailyStats(),
      description: 'Reset daily statistics counters'
    });

    // Process scheduled announcements - runs every minute
    this.jobs.set('scheduled-announcements', {
      schedule: '* * * * *',
      task: () => this.processScheduledAnnouncements(),
      description: 'Process scheduled announcements'
    });

    // Update consistency scores - runs daily at 2 AM
    this.jobs.set('update-consistency', {
      schedule: '0 2 * * *',
      task: () => this.updateConsistencyScores(),
      description: 'Update staff consistency scores'
    });

    // Economy daily reset - runs at midnight
    this.jobs.set('economy-reset', {
      schedule: '0 0 * * *',
      task: () => this.resetEconomyDailies(),
      description: 'Reset economy daily claims'
    });

    // Cache cleanup - runs every 30 minutes
    this.jobs.set('cache-cleanup', {
      schedule: '*/30 * * * *',
      task: () => this.cleanupCache(),
      description: 'Clean up expired cache entries'
    });
  }

  start() {
    if (this.isRunning) return;

    for (const [name, job] of this.jobs) {
      const task = cron.schedule(job.schedule, async () => {
        try {
          logger.info(`[JobScheduler] Running job: ${name}`);
          await job.task();
          logger.info(`[JobScheduler] Completed job: ${name}`);
        } catch (error) {
          logger.error(`[JobScheduler] Error in job ${name}:`, error);
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.get(name).cronTask = task;
    }

    this.isRunning = true;
    logger.info('[JobScheduler] All jobs scheduled and started');
  }

  stop() {
    for (const [name, job] of this.jobs) {
      if (job.cronTask) {
        job.cronTask.stop();
      }
    }
    this.isRunning = false;
    logger.info('[JobScheduler] All jobs stopped');
  }

  async runDailyStatsAggregation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const guilds = await Guild.find({}).lean();

    for (const guildData of guilds) {
      try {
        const guild = this.client.guilds.cache.get(guildData.guildId);
        if (!guild) continue;

        const stats = await UserStats.aggregate([
          { $match: { guildId: guildData.guildId } },
          {
            $group: {
              _id: null,
              totalMessages: { $sum: '$messages.total' },
              totalPoints: { $sum: '$staff.points' },
              totalShifts: { $sum: '$staff.shifts' },
              activeStaff: { $sum: 1 }
            }
          }
        ]);

        await Guild.updateOne(
          { guildId: guildData.guildId },
          {
            $push: {
              dailyStats: {
                date: dateStr,
                ...stats[0]
              }
            }
          }
        );
      } catch (err) {
        logger.error(`[JobScheduler] Error aggregating stats for ${guildData.guildId}:`, err);
      }
    }
  }

  async runWeeklyReports() {
    const guilds = await Guild.find({ 'settings.modules.analytics': true }).lean();

    for (const guildData of guilds) {
      try {
        const guild = this.client.guilds.cache.get(guildData.guildId);
        if (!guild) continue;

        const reportChannelId = guildData.channels?.reports;
        if (!reportChannelId) continue;

        const channel = guild.channels.cache.get(reportChannelId);
        if (!channel) continue;

        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [shifts, warnings, promotions, topStaff] = await Promise.all([
          Shift.countDocuments({ guildId: guildData.guildId, startTime: { $gte: lastWeek } }),
          ModerationLog.countDocuments({ guildId: guildData.guildId, createdAt: { $gte: lastWeek } }),
          Promotion.countDocuments({ guildId: guildData.guildId, createdAt: { $gte: lastWeek } }),
          UserStats.find({ guildId: guildData.guildId })
            .sort({ 'staff.points': -1 })
            .limit(5)
            .lean()
        ]);

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('📊 Weekly Server Report')
          .setDescription(`Report for week of ${lastWeek.toDateString()} - ${new Date().toDateString()}`)
          .addFields(
            { name: '⏱️ Total Shifts', value: shifts.toString(), inline: true },
            { name: '⚠️ Moderation Actions', value: warnings.toString(), inline: true },
            { name: '⬆️ Promotions', value: promotions.toString(), inline: true }
          )
          .setTimestamp();

        if (topStaff.length > 0) {
          const topStaffText = await Promise.all(topStaff.map(async (s, i) => {
            const user = await this.client.users.fetch(s.userId).catch(() => null);
            return `${i + 1}. ${user?.username || 'Unknown'} - ${s.staff.points} pts`;
          }));
          embed.addFields({ name: '🏆 Top Staff', value: topStaffText.join('\n'), inline: false });
        }

        await channel.send({ embeds: [embed] });
      } catch (err) {
        logger.error(`[JobScheduler] Error generating weekly report for ${guildData.guildId}:`, err);
      }
    }
  }

  async cleanupExpiredMutes() {
    const expiredMutes = await ModerationLog.find({
      action: { $in: ['mute', 'ban', 'timeout'] },
      active: true,
      expiresAt: { $lte: new Date() }
    }).lean();

    for (const mute of expiredMutes) {
      try {
        const guild = this.client.guilds.cache.get(mute.guildId);
        if (!guild) continue;

        if (mute.action === 'mute') {
          await this.client.systems.enhancedModeration?.unmute(
            mute.guildId,
            mute.userId,
            this.client.user.id,
            'Duration expired'
          );
        } else if (mute.action === 'ban') {
          await this.client.systems.enhancedModeration?.unban(
            mute.guildId,
            mute.userId,
            this.client.user.id,
            'Ban duration expired'
          );
        } else if (mute.action === 'timeout') {
          const member = await guild.members.fetch(mute.userId).catch(() => null);
          if (member && member.communicationDisabledUntil) {
            await member.timeout(null);
          }
          await ModerationLog.updateOne(
            { _id: mute._id },
            { $set: { active: false } }
          );
        }
      } catch (err) {
        logger.error(`[JobScheduler] Error cleaning up mute ${mute._id}:`, err);
      }
    }
  }

  async runAutoPromotionChecks() {
    if (this.client.systems.autoPromotion) {
      await this.client.systems.autoPromotion.checkAllGuilds();
    }
  }

  async runDailyBackup() {
    const backupDir = './backups';
    const fs = require('fs').promises;
    const path = require('path');

    try {
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

      const [guilds, users, userStats] = await Promise.all([
        Guild.find({}).lean(),
        User.find({}).lean(),
        UserStats.find({}).lean()
      ]);

      const backup = {
        timestamp: new Date().toISOString(),
        guilds,
        users,
        userStats
      };

      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

      // Keep only last 7 backups
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-'))
        .map(f => ({ name: f, path: path.join(backupDir, f) }))
        .sort((a, b) => fs.stat(b.path).then(s => s.mtime) - fs.stat(a.path).then(s => s.mtime));

      if (backupFiles.length > 7) {
        for (const file of backupFiles.slice(7)) {
          await fs.unlink(file.path);
        }
      }

      logger.info(`[JobScheduler] Daily backup created: ${backupFile}`);
    } catch (err) {
      logger.error('[JobScheduler] Error creating daily backup:', err);
    }
  }

  async resetDailyStats() {
    await UserStats.updateMany(
      {},
      {
        $set: {
          'messages.daily': 0,
          'voice.dailyMinutes': 0
        }
      }
    );

    logger.info('[JobScheduler] Daily stats reset completed');
  }

  async processScheduledAnnouncements() {
    const now = new Date();
    const pending = await Announcement.find({
      scheduledFor: { $lte: now },
      sentAt: null
    }).lean();

    for (const announcement of pending) {
      try {
        const guild = this.client.guilds.cache.get(announcement.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(announcement.channelId);
        if (!channel) continue;

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle(announcement.title)
          .setDescription(announcement.content)
          .setTimestamp();

        const mentions = announcement.targetRoleIds?.map(id => `<@&${id}>`).join(' ') || '';

        const message = await channel.send({
          content: mentions,
          embeds: [embed],
          allowedMentions: { roles: announcement.targetRoleIds || [] }
        });

        await Announcement.updateOne(
          { _id: announcement._id },
          {
            $set: {
              sentAt: new Date(),
              messageId: message.id
            }
          }
        );

        if (announcement.pinned) {
          await message.pin();
        }

        if (announcement.reactions?.length > 0) {
          for (const reaction of announcement.reactions) {
            await message.react(reaction).catch(() => {});
          }
        }

        logger.info(`[JobScheduler] Sent scheduled announcement: ${announcement._id}`);
      } catch (err) {
        logger.error(`[JobScheduler] Error sending announcement ${announcement._id}:`, err);
      }
    }
  }

  async updateConsistencyScores() {
    const staffMembers = await UserStats.find({}).lean();

    for (const staff of staffMembers) {
      try {
        if (this.client.systems.staffManagement) {
          await this.client.systems.staffManagement.updateConsistency(
            staff.guildId,
            staff.userId
          );
        }
      } catch (err) {
        logger.error(`[JobScheduler] Error updating consistency for ${staff.userId}:`, err);
      }
    }

    logger.info('[JobScheduler] Consistency scores updated');
  }

  async resetEconomyDailies() {
    await UserStats.updateMany(
      {},
      {
        $set: {
          'economy.lastDaily': null
        }
      }
    );

    logger.info('[JobScheduler] Economy daily claims reset');
  }

  async cleanupCache() {
    if (this.client.systems.cache) {
      await this.client.systems.cache.cleanup();
    }
  }

  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        description: job.description,
        schedule: job.schedule,
        running: !!job.cronTask
      };
    }
    return status;
  }
}

module.exports = JobScheduler;
