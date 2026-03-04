const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const { versionGuard } = require('./guards/versionGuard');
const LicenseSystem = require('./systems/licenseSystem');
const StaffSystem = require('./systems/staffSystem');
const StaffManagementSystem = require('./systems/staffManagementSystem');
const ModerationSystem = require('./systems/moderationSystem');
const EnhancedModerationSystem = require('./systems/enhancedModerationSystem');
const AnalyticsSystem = require('./systems/analyticsSystem');
const AutomationSystem = require('./systems/automationSystem');
const AutoPromotionSystem = require('./systems/autoPromotionSystem');
const LevelingSystem = require('./systems/levelingSystem');
const EconomySystem = require('./systems/economySystem');
const TicketSystem = require('./systems/ticketSystem');
const JobScheduler = require('./systems/jobScheduler');
const WebhookManager = require('./systems/webhookManager');
const commandHandler = require('./handlers/commandHandler');
const { Guild } = require('./database/mongo');
const dashboardSystems = require('./dashboardSystems');
const { initAutoChat } = require('./handlers/autoChatHandler');

// Daily activity model (for message counting)
const DailyActivity = require('./models/activity');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.systems = {};

/**
 * Global authorization check for system-level operations.
 * Validates if a user has sufficient administrative clearance.
 */
client.isOwner = (user) => {
  // In a multi-server context, we typically check for Administrator permissions
  // inside the interaction handlers. For global bot owners, you can add IDs here.
  const owners = [process.env.OWNER_ID]; // Add support for OWNER_ID env
  return owners.includes(user.id);
};

async function initializeSystems() {
  client.systems.license = new LicenseSystem(client);
  await client.systems.license.initialize();

  client.systems.staff = new StaffSystem(client);
  await client.systems.staff.initialize();

  client.systems.staffManagement = new StaffManagementSystem(client);
  await client.systems.staffManagement.initialize();

  client.systems.moderation = new ModerationSystem(client);
  await client.systems.moderation.initialize();

  client.systems.enhancedModeration = new EnhancedModerationSystem(client);
  await client.systems.enhancedModeration.initialize();

  client.systems.analytics = new AnalyticsSystem(client);
  await client.systems.analytics.initialize();

  client.systems.automation = new AutomationSystem(client);
  await client.systems.automation.initialize();

  client.systems.autoPromotion = new AutoPromotionSystem(client);
  await client.systems.autoPromotion.initialize();

  client.systems.leveling = new LevelingSystem(client);
  await client.systems.leveling.initialize();

  client.systems.economy = new EconomySystem(client);
  await client.systems.economy.initialize();

  client.systems.tickets = new TicketSystem(client);
  await client.systems.tickets.initialize();

  client.systems.scheduler = new JobScheduler(client);
  await client.systems.scheduler.initialize();

  client.systems.webhooks = new WebhookManager(client);
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  // FIXED: Now includes all command folders consistently with commandHandler.js
  const defaultVersions = ['v1', 'v1_context', 'buying', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'premium'];
  const versions = process.env.ENABLED_TIERS ? process.env.ENABLED_TIERS.split(',') : defaultVersions;

  // Ensure v1_context is always included if v1 is present (for context menu commands)
  if (versions.includes('v1') && !versions.includes('v1_context')) {
    versions.push('v1_context');
    logger.info('[Commands] Auto-injected v1_context for context menu support');
  }

  for (const version of versions) {
    const versionPath = path.join(commandsPath, version.trim());
    if (!fs.existsSync(versionPath)) continue;

    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    logger.info(`[Commands] Loading ${commandFiles.length} commands from ${version}...`);

    for (const file of commandFiles) {
      try {
        delete require.cache[require.resolve(path.join(versionPath, file))];
        const command = require(path.join(versionPath, file));

        if (!('data' in command)) {
          logger.warn(`[Commands] ${version}/${file}: Missing 'data' property - skipping`);
          continue;
        }
        if (!('execute' in command)) {
          logger.warn(`[Commands] ${version}/${file}: Missing 'execute' function - skipping`);
          continue;
        }
        if (!command.data.name) {
          logger.warn(`[Commands] ${version}/${file}: Missing command name - skipping`);
          continue;
        }

        // Check for duplicate command names
        if (client.commands.has(command.data.name)) {
          logger.warn(`[Commands] ${version}/${file}: Command '${command.data.name}' already exists from another version - overwriting`);
        }

        command.requiredVersion = version;
        client.commands.set(command.data.name, command);
        logger.info(`[Commands] ✓ Loaded ${version}/${file}: /${command.data.name}`);
      } catch (e) {
        logger.error(`[Commands] ✗ Error loading ${version}/${file}: ${e.message}`);
      }
    }
  }
  logger.info(`[Commands] Total loaded: ${client.commands.size} commands`);

  // Log command counts by version
  const versionCounts = {};
  client.commands.forEach(cmd => {
    const ver = cmd.requiredVersion || 'unknown';
    versionCounts[ver] = (versionCounts[ver] || 0) + 1;
  });
  logger.info('[Commands] Breakdown by version:', versionCounts);
}

/**
 * Upserts a Guild document in MongoDB with default free-tier settings.
 * This ensures versionGuard.checkAccess() can always find the guild.
 */
async function ensureGuildRegistered(guild) {
  try {
    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      {
        $setOnInsert: {
          guildId: guild.id,
          name: guild.name,
          ownerId: guild.ownerId,
          iconURL: guild.iconURL({ dynamic: true }) || null,
          premium: { isActive: false, tier: 'free' }
        }
      },
      { upsert: true, new: true }
    );
    logger.info(`[Guild] Registered/confirmed: ${guild.name} (${guild.id})`);
  } catch (err) {
    logger.error(`[Guild] Failed to register guild ${guild.id}:`, err);
  }
}

// Auto-register server when bot is invited
client.on('guildCreate', async (guild) => {
  logger.info(`[Guild] Bot joined: ${guild.name} (${guild.id})`);
  await ensureGuildRegistered(guild);
});

client.once('ready', async () => {
  const tierDisplay = process.env.ENABLED_TIERS ? process.env.ENABLED_TIERS : 'v1-v8';
  logger.info(`Bot logged in as ${client.user.tag}`);
  logger.info(`Active Command Tiers: ${tierDisplay}`);
  await initializeSystems();
  await loadCommands();

  // Sync all guilds the bot is already in (ensures no server is stuck as "not registered")
  logger.info(`[Guild] Running startup guild sync for ${client.guilds.cache.size} servers...`);
  const syncPromises = client.guilds.cache.map(g => ensureGuildRegistered(g));
  await Promise.allSettled(syncPromises);
  logger.info('[Guild] Startup guild sync complete.');

  // Register dashboard-driven auto-working systems
  dashboardSystems.register(client, logger);

  // Initialize Auto-Chat System
  await initAutoChat(client);

  const testGuildId = process.env.TEST_GUILD_ID;
  await commandHandler.deployCommands(client, testGuildId || null).catch(e => logger.error('Deploy error: ' + e.message));

  setInterval(() => client.systems.license.syncLicenses(), 60000);

  // ---------- Activity Alert Monitor ----------
  const ALERT_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  async function checkActivityAlerts() {
    try {
      logger.info('[Activity Alert] Checking activity levels...');
      // Get all guilds with alerts enabled and a channel set
      const guilds = await Guild.find({
        'settings.alerts.enabled': true,
        'settings.alerts.channelId': { $ne: null }
      }).lean();

      if (!guilds.length) return;

      // Yesterday's date in YYYY-MM-DD (UTC)
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      for (const guildData of guilds) {
        try {
          const { guildId, settings } = guildData;
          const { channelId, roleId, threshold } = settings.alerts;

          const discordGuild = client.guilds.cache.get(guildId);
          if (!discordGuild) {
            logger.info(`[Activity Alert] Guild ${guildId} not found (bot left?)`);
            continue;
          }

          const activityRecord = await DailyActivity.findOne({
            guildId,
            date: yesterdayStr
          }).lean();

          const messageCount = activityRecord?.messageCount || 0;

          if (messageCount < threshold) {
            const channel = discordGuild.channels.cache.get(channelId);
            if (!channel) {
              logger.log(`[Activity Alert] Channel ${channelId} not found in guild ${guildId}`);
              continue;
            }

            const embed = new EmbedBuilder()
              .setColor('#f04747')
              .setAuthor({ name: discordGuild.name, iconURL: discordGuild.iconURL({ dynamic: true }) })
              .setTitle('⚠️ Low Activity Detected')
              .setDescription(
                `Yesterday (**${yesterdayStr}**) the server had only **${messageCount}** messages.\n` +
                `This is below the threshold of **${threshold}** messages.`
              )
              .addFields(
                { name: '📉 Total Messages', value: messageCount.toLocaleString(), inline: true },
                { name: '⚙️ Threshold', value: threshold.toLocaleString(), inline: true }
              )
              .setFooter({ text: 'Activity Alert System' })
              .setTimestamp();

            const content = roleId ? `<@&${roleId}>` : '';
            await channel.send({ content, embeds: [embed] });
            logger.info(`[Activity Alert] Alert sent for guild ${guildId} (${messageCount} < ${threshold})`);
          }
        } catch (err) {
          logger.error(`[Activity Alert] Error processing guild ${guildData.guildId}:`, err);
        }
      }
    } catch (err) {
      logger.error('[Activity Alert] Fatal error:', err);
    }
  }

  // Run once immediately after startup (optional)
  checkActivityAlerts();

  // Schedule periodic checks
  setInterval(checkActivityAlerts, ALERT_CHECK_INTERVAL);
});

// Real Data Ingestion Pipeline
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    await DailyActivity.findOneAndUpdate(
      { guildId: message.guild.id, date: today },
      { $inc: { messageCount: 1 } },
      { upsert: true, new: true }
    );

    // Handle leveling system XP
    if (client.systems.leveling) {
      await client.systems.leveling.handleMessage(message);
    }
  } catch (error) {
    logger.error("Error tracking activity:", error);
  }
});

client.on('interactionCreate', async interaction => {
  // --- Button interactions ---
  if (interaction.isButton()) {
    // Promotion buttons
    if (interaction.customId.startsWith('promo_')) {
      try {
        await client.systems.automation.handlePromotionButton(interaction);
      } catch (err) {
        logger.error('Error in promo button', err);
        if (!interaction.replied) await interaction.reply({ content: '❌ Error processing promotion decision.', ephemeral: true });
      }
      return;
    }

    // Ticket system buttons
    const ticketSetup = require('./commands/v1/ticketSetup');
    if (interaction.customId === 'ticket_report_staff') {
      await ticketSetup.handleCreateTicketChannel(interaction, 'report_staff', client);
      return;
    }
    if (interaction.customId === 'ticket_feedback') {
      await ticketSetup.handleCreateTicketChannel(interaction, 'feedback', client);
      return;
    }
    if (interaction.customId.startsWith('ticket_claim_')) {
      await ticketSetup.handleClaimTicket(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('ticket_dm_')) {
      await ticketSetup.handleTicketDM(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('ticket_close_')) {
      await ticketSetup.handleCloseTicket(interaction, client);
      return;
    }

    // Application system buttons
    try {
      const { handleApplyButton, handleReviewAction } = require('./utils/applySystem');

      if (interaction.customId === 'start_application') {
        await handleApplyButton(interaction);
        return;
      }

      if (interaction.customId.startsWith('apply_accept_') || interaction.customId.startsWith('apply_deny_')) {
        await handleReviewAction(interaction);
        return;
      }
    } catch (error) {
      logger.error('Application button error', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred processing this application button!', ephemeral: true }).catch(() => { });
      }
    }

    // --- Phase 2 Interactive Buttons ---
    if (interaction.customId === 'approve_all_promotions') {
      await require('./commands/v1/auto_rank_up').handleApproveAll(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('end_shift_')) {
      await require('./commands/v1/shift_end').handleButtonEndShift(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('export_stats_')) {
      await require('./commands/v1/staff_profile').handleExportStats(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('pause_shift_') || interaction.customId.startsWith('resume_shift_')) {
      await require('./commands/v1/shift_end').handleButtonPauseShift(interaction, client);
      return;
    }

    // --- V2 Staff Hub Handlers ---
    if (interaction.customId.startsWith('hub_')) {
      try {
        if (interaction.customId === 'hub_identity') {
          return await client.commands.get('profile_card').execute(interaction, client);
        }
        if (interaction.customId === 'hub_promo') {
          return await client.commands.get('promotion_status').execute(interaction, client);
        }
        if (interaction.customId === 'hub_tasks') {
          return await client.commands.get('task_assign').execute(interaction, client);
        }
      } catch (err) {
        logger.error('Staff Hub Button Error:', err);
        return interaction.followUp({ content: '❌ System failure: Unable to bridge to the requested module.', ephemeral: true });
      }
    }
  }

  // --- Select Menu Interactions ---
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('quick_action_')) {
      await require('./commands/v1/warn').handleQuickAction(interaction, client);
      return;
    }
    if (interaction.customId === 'equip_perk') {
      await require('./commands/v2/staff_perks').handleSelect(interaction);
      return;
    }

    // --- V2 Apex Shop Handlers ---
    const shopActions = ['buy_flair', 'buy_frame', 'buy_title'];
    if (shopActions.includes(interaction.customId)) {
      try {
        const { User } = require('./database/mongo');
        const userData = await User.findOne({ userId: interaction.user.id, guildId: interaction.guildId });

        let cost = 0;
        let update = {};
        let item = '';

        if (interaction.customId === 'buy_flair') { cost = 500; update = { 'staff.tagline': '🌟 ' + userData.staff.tagline }; item = 'Tactical Flair'; }
        if (interaction.customId === 'buy_frame') { cost = 1000; update = { 'staff.equippedPerk': '💎 ' + (userData.staff.equippedPerk || 'Personnel') }; item = 'Badge Frame'; }
        if (interaction.customId === 'buy_title') { cost = 5000; update = { 'staff.honorific': '👑 APEX ELITE' }; item = 'Apex Title'; }

        if (userData.staff.points < cost) {
          return interaction.reply({ content: `❌ Insufficient Strategic Points. Required: \`${cost}\``, ephemeral: true });
        }

        await User.findOneAndUpdate(
          { userId: interaction.user.id, guildId: interaction.guildId },
          { $inc: { 'staff.points': -cost }, $set: update }
        );

        return interaction.reply({ content: `✅ **Purchase Authenticated**: ${item} has been applied to your profile card.`, ephemeral: true });
      } catch (err) {
        logger.error('Shop Purchase Error:', err);
        return interaction.reply({ content: '❌ Transaction failure: Unable to establish shop connection.', ephemeral: true });
      }
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (interaction.customId.startsWith('config_')) {
      await require('./commands/v1/setup_dashboard').handleChannelSelect(interaction, client);
      return;
    }
  }

  if (interaction.isRoleSelectMenu()) {
    if (interaction.customId.startsWith('config_')) {
      await require('./commands/v1/setup_dashboard').handleRoleSelect(interaction, client);
      return;
    }
  }

  // --- Modal submit interactions ---
  if (interaction.isModalSubmit()) {
    // Application modal
    try {
      const { handleModalSubmit } = require('./utils/applySystem');
      if (interaction.customId === 'apply_modal_submit') {
        await handleModalSubmit(interaction);
        return;
      }
    } catch (error) {
      logger.error('Modal submit error', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to submit application!', ephemeral: true }).catch(() => { });
      }
    }

    // Ticket modals
    const ticketSetup = require('./commands/v1/ticketSetup');
    if (interaction.customId === 'modal_report_staff') {
      await ticketSetup.handleReportSubmit(interaction, client);
      return;
    }
    if (interaction.customId === 'modal_feedback') {
      await ticketSetup.handleFeedbackSubmit(interaction, client);
      return;
    }
    if (interaction.customId.startsWith('modal_dm_reply_')) {
      await ticketSetup.handleDMReply(interaction, client);
      return;
    }

    // Context Menu Modals
    if (interaction.customId.startsWith('modal_quick_warn_')) {
      try {
        await interaction.deferReply({ ephemeral: true });
        const targetUserId = interaction.customId.replace('modal_quick_warn_', '');
        const reason = interaction.fields.getTextInputValue('warn_reason') || 'No reason provided';
        const severity = interaction.fields.getTextInputValue('warn_severity') || 'medium';

        const staffSystem = client.systems.staff;
        if (!staffSystem) {
          return interaction.editReply({ content: '❌ Staff system is currently offline.' });
        }

        const result = await staffSystem.addWarning(targetUserId, interaction.guildId, reason, interaction.user.id, severity);

        const targetUser = await client.users.fetch(targetUserId).catch(() => null);
        const userTag = targetUser ? targetUser.tag : 'Unknown User';

        const { createCoolEmbed } = require('./utils/embeds');
        const embed = createCoolEmbed()
          .setTitle('⚠️ Context Menu Warn Executed')
          .addFields(
            { name: '👤 User Warned', value: `<@${targetUserId}> (${userTag})`, inline: true },
            { name: '📉 Points Deducted', value: `\`${result.points}\``, inline: true },
            { name: '📝 Reason', value: reason, inline: false }
          )
          .setColor('warning');

        await interaction.editReply({ embeds: [embed] });

        if (targetUser) {
          try {
            await targetUser.send(`**Warning from ${interaction.guild.name}**\nReason: ${reason}\nSeverity: ${severity.toUpperCase()}`);
          } catch (e) { }
        }
      } catch (err) {
        console.error('QuickWarn Modal Error:', err);
        await interaction.editReply({ content: '❌ An error occurred processing this warning.' });
      }
      return;
    }
  }

  // --- Help menu select menu ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
    try {
      const helpCommand = client.commands.get('help');
      if (helpCommand && helpCommand.generateCategoryEmbed) {
        const categoryKey = interaction.values[0];
        const embed = await helpCommand.generateCategoryEmbed(categoryKey, client);
        await interaction.update({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Help menu interaction error', error);
    }
  }

  // --- Promo setup select menu ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'promo_setup_select') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const rank = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`promo_setup_modal_${rank}`)
      .setTitle(`Configure Rank: ${rank.toUpperCase()}`);

    const pointsInput = new TextInputBuilder()
      .setCustomId('promo_points')
      .setLabel('Points Threshold')
      .setPlaceholder('Number of points needed...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const shiftsInput = new TextInputBuilder()
      .setCustomId('promo_shifts')
      .setLabel('Minimum Shifts')
      .setPlaceholder('Number of shifts needed...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const consistencyInput = new TextInputBuilder()
      .setCustomId('promo_consistency')
      .setLabel('Consistency (%)')
      .setPlaceholder('Minimum consistency (0-100)...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const warningsInput = new TextInputBuilder()
      .setCustomId('promo_warnings')
      .setLabel('Max Warnings Allowed')
      .setPlaceholder('Staff cannot exceed this number...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(pointsInput),
      new ActionRowBuilder().addComponents(shiftsInput),
      new ActionRowBuilder().addComponents(consistencyInput),
      new ActionRowBuilder().addComponents(warningsInput)
    );

    await interaction.showModal(modal);
  }

  // --- Promo setup modal submit ---
  if (interaction.isModalSubmit() && interaction.customId.startsWith('promo_setup_modal_')) {
    try {
      const rank = interaction.customId.replace('promo_setup_modal_', '');
      const points = parseInt(interaction.fields.getTextInputValue('promo_points'));
      const shifts = parseInt(interaction.fields.getTextInputValue('promo_shifts'));
      const consistency = parseInt(interaction.fields.getTextInputValue('promo_consistency'));
      const warnings = parseInt(interaction.fields.getTextInputValue('promo_warnings'));

      if (isNaN(points) || isNaN(shifts) || isNaN(consistency) || isNaN(warnings)) {
        return interaction.reply({ content: '❌ Please enter valid numbers for all fields.', ephemeral: true });
      }

      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            'promo.points': points,
            'promo.shifts': shifts,
            'promo.consistency': consistency,
            'promo.warnings': warnings
          }
        },
        { upsert: true }
      );

      const { createSuccessEmbed } = require('./utils/embeds');
      const successEmbed = createSuccessEmbed(
        'Promotion Criteria Saved',
        `Rank **${rank.toUpperCase()}** configured:\n• Points: ${points}\n• Shifts: ${shifts}\n• Consistency: ${consistency}%\n• Max Warnings: ${warnings}`
      );
      await interaction.reply({
        embeds: [successEmbed],
        ephemeral: true
      });
    } catch (error) {
      logger.error('Promo modal submit error', error);
      await interaction.reply({ content: '❌ An error occurred while saving configuration.', ephemeral: true }).catch(() => { });
    }
  }

  // --- Chat input Commands and Context Menus ---
  if (!interaction.isChatInputCommand() && !interaction.isUserContextMenuCommand() && !interaction.isMessageContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`[Command] Received unknown command: ${interaction.commandName}`);
    return interaction.reply({
      content: '❌ This command is not available. It may still be deploying or has been removed.',
      ephemeral: true
    });
  }

  logger.info(`[Command] /${interaction.commandName} called by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guildId}`);
  logger.info(`[Command] Command version tier: ${command.requiredVersion || 'unknown'}`);

  let hasAccess;
  try {
    hasAccess = await versionGuard.checkAccess(
      interaction.guildId,
      interaction.user.id,
      command.requiredVersion || 'v1'
    );
  } catch (guardError) {
    logger.error(`[Command] Version guard error for /${interaction.commandName}:`, guardError);
    return interaction.reply({
      content: '❌ An error occurred while checking permissions. Please try again.',
      ephemeral: true
    });
  }

  logger.info(`[Command] Access check result: allowed=${hasAccess.allowed}`);

  if (!hasAccess.allowed) {
    logger.info(`[Command] Access denied for ${interaction.user.tag}: ${hasAccess.message}`);
    return interaction.reply({
      content: hasAccess.message || '💎 **Premium Required**\n\nThis command requires a higher tier. Use `/buy` to upgrade!',
      ephemeral: true
    });
  }

  const { cooldowns } = client;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown || defaultCooldownDuration) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);
      return interaction.reply({
        content: `Please wait, you are on cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        ephemeral: true
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction, client);
    // Give user XP for using commands
    const { handleCommandXP } = require('./utils/xpSystem');
    await handleCommandXP(interaction);
  } catch (error) {
    logger.error(`[Command] Execution error in /${interaction.commandName}:`, error);
    logger.error(`[Command] Error stack: ${error.stack}`);

    const errorMessage = process.env.NODE_ENV === 'development'
      ? `❌ Command Error: \`${error.message}\``
      : '❌ There was an error executing this command!';

    const reply = {
      content: errorMessage,
      ephemeral: true
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyError) {
      logger.error(`[Command] Failed to send error reply:`, replyError);
    }
  }
});

const app = express();
app.locals.client = client;

// Security middleware - helmet should be first
app.use(require('helmet')());
app.use(require('cors')());

// Raw body parsing for Stripe webhooks (must be before express.json)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Rate limiting configurations
const rateLimit = require('express-rate-limit');

// General API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter rate limiter for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 webhook events per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests' }
});
app.use('/webhooks/', webhookLimiter);

// Stricter rate limiter for payment checkout creation
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 checkout creations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts, please try again later' }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '8.0.0',
    strata: 'all'
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.set('client', client);

app.use('/api/licenses', require('./api/licenses'));
app.use('/api/guilds', require('./api/guilds'));
app.use('/api/stats', require('./api/stats'));
app.use('/api/commands', require('./api/commands'));
app.use('/api/dashboard', require('./api/routes'));
app.use('/api/v2', require('./api/dashboard'));

// Mount webhook routes with specific middleware
const paymentWebhook = require('./webhook/paymentWebhook');
app.use('/webhooks/stripe', paymentWebhook);
app.use('/webhooks/paypal', paymentWebhook);
app.use('/webhooks/create-checkout-session', checkoutLimiter, paymentWebhook);

// Mount new webhook manager routes (initialized in systems)
app.use('/webhooks', (req, res, next) => {
  if (client.systems.webhooks) {
    return client.systems.webhooks.getRouter()(req, res, next);
  }
  next();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN)
  .catch(err => {
    logger.error('Discord login error:', err);
    process.exit(1);
  });

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});