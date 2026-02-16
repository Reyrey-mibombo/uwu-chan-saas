const logger = require('../utils/logger');
const cron = require('node-cron');
const { Guild, User, Shift, Activity } = require('../database/mongo');

class AutomationSystem {
  constructor(client) {
    this.client = client;
    this.scheduledTasks = new Map();
    this.rules = new Map();
    this.automations = new Map();
  }

  async initialize() {
    logger.info('Automation System initialized');
    this.startBackgroundTasks();
  }

  startBackgroundTasks() {
    cron.schedule('0 0 * * *', () => this.runDailyTasks());
    cron.schedule('0 9 * * *', () => this.runDailyReminder());
    cron.schedule('0 9 * * 1', () => this.runWeeklyReport());
    cron.schedule('*/15 * * * *', () => this.checkExpiringLicenses());
  }

  async runDailyTasks() {
    logger.info('Running daily automation tasks');
    const guilds = await Guild.find({});
    
    for (const guildData of guilds) {
      try {
        const guild = this.client.guilds.cache.get(guildData.guildId);
        if (!guild) continue;

        if (guildData.settings?.modules?.automation) {
          await this.dailyBonusPoints(guildData.guildId);
          await this.checkShiftRequirements(guildData.guildId);
        }
      } catch (e) {
        logger.error(`Daily task error for guild ${guildData.guildId}:`, e);
      }
    }
  }

  async runDailyReminder() {
    logger.info('Running daily reminder');
    const guilds = await Guild.find({});
    
    for (const guildData of guilds) {
      try {
        const guild = this.client.guilds.cache.get(guildData.guildId);
        if (!guild) continue;

        const staffChannel = guild.channels.cache.find(c => 
          c.name.includes('staff') || c.name.includes('duty')
        );
        
        if (staffChannel) {
          await staffChannel.send('📋 Daily Reminder: Don\'t forget to start your shift!');
        }
      } catch (e) {
        logger.error(`Reminder error for guild ${guildData.guildId}:`, e);
      }
    }
  }

  async runWeeklyReport() {
    logger.info('Running weekly reports');
    const guilds = await Guild.find({});
    
    for (const guildData of guilds) {
      try {
        const guild = this.client.guilds.cache.get(guildData.guildId);
        if (!guild) continue;

        const analytics = this.client.systems.analytics;
        const report = await analytics.generateReport(guildData.guildId, 'weekly');
        
        const modChannel = guild.channels.cache.get(guildData.settings?.modChannel);
        if (modChannel) {
          await modChannel.send(`📊 **Weekly Report**\nMessages: ${report.stats.messages}\nCommands: ${report.stats.commands}\nActive Users: ${report.stats.activeUsers}`);
        }
      } catch (e) {
        logger.error(`Weekly report error for guild ${guildData.guildId}:`, e);
      }
    }
  }

  async checkExpiringLicenses() {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const expiringLicenses = await require('../database/mongo').License.find({
      status: 'active',
      expiresAt: { $lte: soon, $gt: new Date() }
    });

    for (const license of expiringLicenses) {
      try {
        const guild = this.client.guilds.cache.get(license.guildId);
        if (guild) {
          const owner = await guild.fetchOwner();
          if (owner) {
            owner.send(`⏰ Your Uwu-chan premium subscription expires in ${Math.floor((license.expiresAt - new Date()) / (24 * 60 * 60 * 1000))} days! Renew now to keep your features.`);
          }
        }
      } catch (e) {
        logger.error('License expiry notification error:', e);
      }
    }
  }

  async dailyBonusPoints(guildId) {
    const users = await User.find({ 'guilds.guildId': guildId });
    const bonusPoints = 10;
    
    for (const user of users) {
      if (!user.staff) user.staff = { points: 0 };
      user.staff.points = (user.staff.points || 0) + bonusPoints;
      await user.save();

      await Activity.create({
        guildId,
        userId: user.userId,
        type: 'command',
        data: { action: 'daily_bonus', points: bonusPoints }
      });
    }
  }

  async checkShiftRequirements(guildId) {
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } });
    
    for (const user of users) {
      if (user.staff?.consistency < 50 && user.staff?.rank !== 'member') {
        await this.autoDemote(user.userId, guildId, 'Low consistency');
      }
    }
  }

  async autoDemote(userId, guildId, reason) {
    const user = await User.findOne({ userId });
    if (!user || !user.staff) return;

    const ranks = ['member', 'trial', 'staff', 'moderator', 'admin', 'owner'];
    const currentRank = user.staff.rank || 'member';
    const currentIndex = ranks.indexOf(currentRank);
    
    if (currentIndex > 0) {
      user.staff.rank = ranks[currentIndex - 1];
      await user.save();

      await Activity.create({
        guildId,
        userId,
        type: 'promotion',
        data: { action: 'auto_demote', reason, newRank: user.staff.rank }
      });
    }
  }

  async createRule(guildId, ruleConfig) {
    const ruleId = Date.now().toString(36);
    this.rules.set(`${guildId}-${ruleId}`, {
      id: ruleId,
      guildId,
      ...ruleConfig,
      enabled: true,
      createdAt: new Date(),
      executions: 0
    });
    return { success: true, ruleId };
  }

  async getRules(guildId) {
    const rules = [];
    for (const [key, rule] of this.rules) {
      if (rule.guildId === guildId) {
        rules.push(rule);
      }
    }
    return rules;
  }

  async executeRule(guildId, ruleId, context) {
    const rule = this.rules.get(`${guildId}-${ruleId}`);
    if (!rule || !rule.enabled) return { success: false, message: 'Rule not found or disabled' };

    rule.executions++;
    rule.lastExecuted = new Date();
    
    switch (rule.action) {
      case 'assign_role':
        await this.actionAssignRole(guildId, rule, context);
        break;
      case 'send_message':
        await this.actionSendMessage(guildId, rule, context);
        break;
      case 'add_points':
        await this.actionAddPoints(guildId, rule, context);
        break;
    }
    
    this.rules.set(`${guildId}-${ruleId}`, rule);
    return { success: true, executed: true };
  }

  async actionAssignRole(guildId, rule, context) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;
    
    const member = await guild.members.fetch(context.userId);
    if (!member) return;

    const role = guild.roles.cache.get(rule.config.roleId);
    if (role) {
      await member.roles.add(role);
    }
  }

  async actionSendMessage(guildId, rule, context) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(rule.config.channelId);
    if (channel) {
      const message = rule.config.message
        .replace('{user}', context.userId)
        .replace('{action}', context.action);
      await channel.send(message);
    }
  }

  async actionAddPoints(guildId, rule, context) {
    const points = rule.config.points || 10;
    await User.updateOne(
      { userId: context.userId },
      { $inc: { 'staff.points': points } }
    );
  }

  async deleteRule(guildId, ruleId) {
    const key = `${guildId}-${ruleId}`;
    if (this.rules.has(key)) {
      this.rules.delete(key);
      return { success: true };
    }
    return { success: false, message: 'Rule not found' };
  }

  async scheduleTask(guildId, taskConfig) {
    if (!cron.validate(taskConfig.cron)) {
      return { success: false, message: 'Invalid cron expression' };
    }

    const taskId = Date.now().toString(36);
    const task = cron.schedule(taskConfig.cron, async () => {
      logger.info(`Executing scheduled task ${taskId} for guild ${guildId}`);
      await this.executeTask(guildId, taskConfig);
    });

    this.scheduledTasks.set(`${guildId}-${taskId}`, { task, config: taskConfig });
    return { success: true, taskId };
  }

  async executeTask(guildId, config) {
    switch (config.type) {
      case 'reminder':
        await this.sendReminder(guildId, config);
        break;
      case 'report':
        await this.sendScheduledReport(guildId, config);
        break;
    }
  }

  async sendReminder(guildId, config) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(config.channelId);
    if (channel) {
      await channel.send(config.message);
    }
  }

  async sendScheduledReport(guildId, config) {
    const analytics = this.client.systems.analytics;
    if (!analytics) return;

    const report = await analytics.generateReport(guildId, 'weekly');
    const guild = this.client.guilds.cache.get(guildId);
    
    if (!guild) return;
    const channel = guild.channels.cache.get(config.channelId);
    if (channel) {
      await channel.send(`📊 **Scheduled Report**\n${report.stats.messages} messages\n${report.stats.commands} commands\n${report.stats.activeUsers} active users`);
    }
  }

  async cancelTask(guildId, taskId) {
    const key = `${guildId}-${taskId}`;
    const taskData = this.scheduledTasks.get(key);
    if (taskData) {
      taskData.task.stop();
      this.scheduledTasks.delete(key);
      return { success: true };
    }
    return { success: false, message: 'Task not found' };
  }

  async getScheduledTasks(guildId) {
    const tasks = [];
    for (const [key, data] of this.scheduledTasks) {
      if (key.startsWith(guildId)) {
        tasks.push({ taskId: key.split('-')[1], config: data.config });
      }
    }
    return tasks;
  }
}

module.exports = AutomationSystem;
