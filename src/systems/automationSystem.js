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
    // Auto-promotion check every 15 minutes
    cron.schedule('*/15 * * * *', () => this.checkAutoPromotions());
  }

  // ============================================================
  // AUTO-PROMOTION ENGINE
  // ============================================================

  async checkAutoPromotions() {
    logger.info('[PROMO] Running background promotion checks');
    const guilds = await Guild.find({ 'settings.modules.automation': true });
    const PromotionSystem = require('../utils/promotionSystem');

    for (const guildData of guilds) {
      const allUsers = await User.find({ 'staff.points': { $gt: 0 } });
      for (const user of allUsers) {
        try {
          await PromotionSystem.checkEligibility(user.userId, guildData.guildId, this.client);
        } catch (e) {
          logger.error(`Error in background promotion check for ${user.userId}: ${e.message}`);
        }
      }
    }
  }

  async sendOwnerPromotionDM(owner, user, guildData, nextRank, checks, shiftCount, achievements) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const rankEmojis = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };

    const requirementLines = Object.values(checks).map(c =>
      `${c.met ? '✅' : '❌'} **${c.label}**: ${c.val} / ${c.req}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Promotion Review — ${user.username || user.userId}`)
      .setColor(0xf1c40f)
      .setDescription(`**${user.username || 'A staff member'}** has met all requirements for **${rankEmojis[nextRank] || ''} ${nextRank.toUpperCase()}** in **${guildData.name || 'your server'}**!`)
      .addFields(
        { name: '👤 User', value: `<@${user.userId}>`, inline: true },
        { name: '🎖️ Current Rank', value: (user.staff?.rank || 'member').toUpperCase(), inline: true },
        { name: '⬆️ Applying For', value: `${rankEmojis[nextRank] || ''} ${nextRank.toUpperCase()}`, inline: true },
        { name: '📋 Requirements Checklist', value: requirementLines },
        { name: '🏅 Achievements', value: achievements.toString(), inline: true },
        { name: '🖥️ Server', value: guildData.name || guildData.guildId, inline: true },
        ...(guildData.promotionRequirements?.[nextRank]?.customNote
          ? [{ name: '📝 Custom Note (from owner)', value: guildData.promotionRequirements[nextRank].customNote }]
          : [])
      )
      .setFooter({ text: `User ID: ${user.userId} | Guild: ${guildData.guildId}` })
      .setTimestamp();

    // Buttons: Approve, Interview, Deny
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`promo_approve_${user.userId}_${guildData.guildId}_${nextRank}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`promo_interview_${user.userId}_${guildData.guildId}_${nextRank}`)
        .setLabel('🗣️ Interview')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`promo_deny_${user.userId}_${guildData.guildId}_${nextRank}`)
        .setLabel('❌ Deny')
        .setStyle(ButtonStyle.Danger)
    );

    await owner.send({ embeds: [embed], components: [row] });
    logger.info(`[PROMO] Owner DM sent for ${user.username} → ${nextRank}`);
  }

  // ============================================================
  // BUTTON HANDLER (called from index.js interactionCreate)
  // ============================================================

  async handlePromotionButton(interaction) {
    const { EmbedBuilder } = require('discord.js');
    const parts = interaction.customId.split('_');
    // Format: promo_ACTION_userId_guildId_rank
    const action = parts[1]; // approve / interview / deny
    const userId = parts[2];
    const guildId = parts[3];
    const newRank = parts[4];

    await interaction.deferUpdate();

    const user = await User.findOne({ userId });
    const guildData = await Guild.findOne({ guildId });
    const discordGuild = this.client.guilds.cache.get(guildId);

    if (!user || !guildData || !discordGuild) {
      return interaction.editReply({ content: '❌ Could not find user or guild data.', components: [] });
    }

    const rankEmojis = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };

    if (action === 'approve') {
      // 1. Update user rank in DB
      const oldRank = user.staff?.rank || 'member';
      user.staff.rank = newRank;
      user.staff.promotionPending = false;
      await user.save();

      // 2. Log to Activity
      await Activity.create({
        guildId, userId,
        type: 'promotion',
        data: { newRank, oldRank, promotedBy: 'auto', approvedBy: interaction.user.id }
      });

      // 3. Assign Discord role + remove old role
      const member = await discordGuild.members.fetch(userId).catch(() => null);
      if (member && guildData.rankRoles) {
        const newRoleId = guildData.rankRoles[newRank];
        const oldRoleId = guildData.rankRoles[oldRank];
        if (oldRoleId) await member.roles.remove(oldRoleId).catch(() => { });
        if (newRoleId) await member.roles.add(newRoleId).catch(() => { });
      }

      // 4. Post announcement in promotion channel
      if (guildData.settings?.promotionChannel) {
        const ch = discordGuild.channels.cache.get(guildData.settings.promotionChannel);
        if (ch) {
          const announceEmbed = new EmbedBuilder()
            .setTitle('🎊 ★ PROMOTION ANNOUNCEMENT ★ 🎊')
            .setColor(0xf1c40f)
            .setDescription(`✨ **Congratulations** <@${userId}>! ✨\n\nYou have been promoted to **${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}**!\n\nKeep up the amazing work! 🚀`)
            .addFields(
              { name: '👤 Staff', value: `<@${userId}>`, inline: true },
              { name: '⬆️ New Rank', value: `${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}`, inline: true },
              { name: '✅ Approved By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();
          await ch.send({ embeds: [announceEmbed] });
        }
      }

      // 5. DM the promoted user
      const targetUser = await this.client.users.fetch(userId).catch(() => null);
      if (targetUser) {
        await targetUser.send({
          embeds: [new EmbedBuilder()
            .setTitle(`🎉 You've been promoted!`)
            .setColor(0x2ecc71)
            .setDescription(`Congratulations! You've been promoted to **${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}** in **${discordGuild.name}**!\n\nKeep up the great work! 💪`)
            .setTimestamp()]
        }).catch(() => { });
      }

      // 6. Update the owner DM to show it was handled
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Promotion Approved')
          .setColor(0x2ecc71)
          .setDescription(`**${user.username || userId}** has been promoted to **${newRank.toUpperCase()}**.\nRole assigned, announcement posted, user notified.`)],
        components: []
      });

    } else if (action === 'interview') {
      // Mark pending so they stay pending until owner decides after interview
      user.staff.promotionPending = true;
      await user.save();

      // DM the user to report for interview
      const targetUser = await this.client.users.fetch(userId).catch(() => null);
      if (targetUser) {
        await targetUser.send({
          embeds: [new EmbedBuilder()
            .setTitle('📋 Interview Invitation')
            .setColor(0x3498db)
            .setDescription(`Hey **${user.username || 'there'}**! You've met the requirements for a promotion in **${discordGuild.name}**!\n\nThe owner wants to hold an **interview** before confirming your promotion. Please check the server for further instructions.\n\nGood luck! 🍀`)
            .setTimestamp()]
        }).catch(() => { });
      }

      // Post in promotion channel
      if (guildData.settings?.promotionChannel) {
        const ch = discordGuild.channels.cache.get(guildData.settings.promotionChannel);
        if (ch) {
          await ch.send({ content: `📋 <@${userId}> has been invited for a promotion interview for the **${newRank.toUpperCase()}** rank.` });
        }
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('🗣️ Interview Requested')
          .setColor(0x3498db)
          .setDescription(`**${user.username || userId}** has been notified about the interview. Use /rank_announce to approve after the interview.`)],
        components: []
      });

    } else if (action === 'deny') {
      user.staff.promotionPending = false;
      user.staff.lastPromotionCheck = new Date();
      await user.save();

      // Optional: DM the user they were not promoted this cycle
      const targetUser = await this.client.users.fetch(userId).catch(() => null);
      if (targetUser) {
        await targetUser.send({
          embeds: [new EmbedBuilder()
            .setTitle('Keep It Up! 💪')
            .setColor(0xe74c3c)
            .setDescription(`Hey **${user.username || 'there'}**! Your promotion to **${newRank.toUpperCase()}** in **${discordGuild.name}** wasn't approved this time.\n\nDon't give up — keep earning points and completing shifts. You'll get there! 🚀`)
            .setTimestamp()]
        }).catch(() => { });
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('❌ Promotion Denied')
          .setColor(0xe74c3c)
          .setDescription(`**${user.username || userId}** will not be promoted this cycle. They'll be re-checked in the next promotion scan.`)],
        components: []
      });
    }
  }

  // ============================================================
  // ORIGINAL SYSTEMS (unchanged)
  // ============================================================

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
      await Activity.create({ guildId, userId: user.userId, type: 'command', data: { action: 'daily_bonus', points: bonusPoints } });
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
    const ranks = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
    const currentRank = user.staff.rank || 'member';
    const currentIndex = ranks.indexOf(currentRank);
    if (currentIndex > 0) {
      user.staff.rank = ranks[currentIndex - 1];
      await user.save();
      await Activity.create({ guildId, userId, type: 'promotion', data: { action: 'auto_demote', reason, newRank: user.staff.rank } });
    }
  }

  async createRule(guildId, ruleConfig) {
    const ruleId = Date.now().toString(36);
    this.rules.set(`${guildId}-${ruleId}`, { id: ruleId, guildId, ...ruleConfig, enabled: true, createdAt: new Date(), executions: 0 });
    return { success: true, ruleId };
  }

  async getRules(guildId) {
    const rules = [];
    for (const [key, rule] of this.rules) {
      if (rule.guildId === guildId) rules.push(rule);
    }
    return rules;
  }

  async executeRule(guildId, ruleId, context) {
    const rule = this.rules.get(`${guildId}-${ruleId}`);
    if (!rule || !rule.enabled) return { success: false, message: 'Rule not found or disabled' };
    rule.executions++;
    rule.lastExecuted = new Date();
    switch (rule.action) {
      case 'assign_role': await this.actionAssignRole(guildId, rule, context); break;
      case 'send_message': await this.actionSendMessage(guildId, rule, context); break;
      case 'add_points': await this.actionAddPoints(guildId, rule, context); break;
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
    if (role) await member.roles.add(role);
  }

  async actionSendMessage(guildId, rule, context) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(rule.config.channelId);
    if (channel) {
      const message = rule.config.message.replace('{user}', context.userId).replace('{action}', context.action);
      await channel.send(message);
    }
  }

  async actionAddPoints(guildId, rule, context) {
    const points = rule.config.points || 10;
    await User.updateOne({ userId: context.userId }, { $inc: { 'staff.points': points } });
  }

  async deleteRule(guildId, ruleId) {
    const key = `${guildId}-${ruleId}`;
    if (this.rules.has(key)) { this.rules.delete(key); return { success: true }; }
    return { success: false, message: 'Rule not found' };
  }

  async scheduleTask(guildId, taskConfig) {
    if (!cron.validate(taskConfig.cron)) return { success: false, message: 'Invalid cron expression' };
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
      case 'reminder': await this.sendReminder(guildId, config); break;
      case 'report': await this.sendScheduledReport(guildId, config); break;
    }
  }

  async sendReminder(guildId, config) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(config.channelId);
    if (channel) await channel.send(config.message);
  }

  async sendScheduledReport(guildId, config) {
    const analytics = this.client.systems.analytics;
    if (!analytics) return;
    const report = await analytics.generateReport(guildId, 'weekly');
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(config.channelId);
    if (channel) await channel.send(`📊 **Scheduled Report**\n${report.stats.messages} messages\n${report.stats.commands} commands\n${report.stats.activeUsers} active users`);
  }

  async cancelTask(guildId, taskId) {
    const key = `${guildId}-${taskId}`;
    const taskData = this.scheduledTasks.get(key);
    if (taskData) { taskData.task.stop(); this.scheduledTasks.delete(key); return { success: true }; }
    return { success: false, message: 'Task not found' };
  }

  async getScheduledTasks(guildId) {
    const tasks = [];
    for (const [key, data] of this.scheduledTasks) {
      if (key.startsWith(guildId)) tasks.push({ taskId: key.split('-')[1], config: data.config });
    }
    return tasks;
  }
}

module.exports = AutomationSystem;
