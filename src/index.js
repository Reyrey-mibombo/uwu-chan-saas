const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const { versionGuard } = require('./guards/versionGuard');
const LicenseSystem = require('./systems/licenseSystem');
const StaffSystem = require('./systems/staffSystem');
const ModerationSystem = require('./systems/moderationSystem');
const AnalyticsSystem = require('./systems/analyticsSystem');
const AutomationSystem = require('./systems/automationSystem');
const TicketSystem = require('./systems/ticketSystem');
const commandHandler = require('./handlers/commandHandler');
const { Guild } = require('./database/mongo');

// FIXED: Correctly named the variable DailyActivity to match usage below
const DailyActivity = require('./models/activity');

const client = new Client({
  intents:
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.systems = {};

async function initializeSystems() {
  client.systems.license = new LicenseSystem(client);
  await client.systems.license.initialize();

  client.systems.staff = new StaffSystem(client);
  await client.systems.staff.initialize();

  client.systems.moderation = new ModerationSystem(client);
  await client.systems.moderation.initialize();

  client.systems.analytics = new AnalyticsSystem(client);
  await client.systems.analytics.initialize();

  client.systems.automation = new AutomationSystem(client);
  await client.systems.automation.initialize();

  client.systems.tickets = new TicketSystem(client);
  await client.systems.tickets.initialize();
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const defaultVersions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
  const versions = process.env.ENABLED_TIERS? process.env.ENABLED_TIERS.split(',') : defaultVersions;

  for (const version of versions) {
    const versionPath = path.join(commandsPath, version.trim());
    if (!fs.existsSync(versionPath)) continue;

    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        delete require.cache[require.resolve(path.join(versionPath, file))];
        const command = require(path.join(versionPath, file));
        if ('data' in command && 'execute' in command) {
          command.requiredVersion = version;
          client.commands.set(command.data.name, command);
        }
      } catch (e) {
        logger.error(`Error loading command ${file}: ${e.message}`);
      }
    }
  }
  logger.info(`Loaded ${client.commands.size} commands`);
}

client.once('ready', async () => {
  const tierDisplay = process.env.ENABLED_TIERS? process.env.ENABLED_TIERS : 'v1-v8';
  logger.info(`Bot logged in as ${client.user.tag}`);
  logger.info(`Active Command Tiers: ${tierDisplay}`);
  await initializeSystems();
  await loadCommands();

  const testGuildId = process.env.TEST_GUILD_ID;
  await commandHandler.deployCommands(client, testGuildId? testGuildId : null).catch(e => logger.error('Deploy error: ' + e.message));

  setInterval(() => client.systems.license.syncLicenses(), 60000);
});

// --- ADDED: Real Data Ingestion Pipeline ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const today = new Date().toISOString().split('T');

  try {
    await DailyActivity.findOneAndUpdate(
      { guildId: message.guild.id, date: today },
      { $inc: { messageCount: 1 } },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.error("Error tracking activity:", error);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId.startsWith('promo_')) {
    try {
      await client.systems.automation.handlePromotionButton(interaction);
    } catch (err) {
      logger.error('Error in promo button', err);
      if (!interaction.replied) await interaction.reply({ content: '❌ Error processing promotion decision.', ephemeral: true });
    }
    return;
  }

  if (interaction.isButton()) {
    const ticketSetup = require('./commands/v1/ticketSetup');
    if (interaction.customId === 'ticket_report_staff') {
      await ticketSetup.handleReportStaff(interaction, client);
      return;
    }
    if (interaction.customId === 'ticket_feedback') {
      await ticketSetup.handleFeedback(interaction, client);
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

    try {
      const { handleApplyButton, handleReviewAction } = require('./utils/applySystem');

      if (interaction.customId === 'start_application') {
        await handleApplyButton(interaction);
        return;
      }
      
      // FIXED: The formatting broke the '||' OR operator here. It's now fixed.
      if (interaction.customId.startsWith('apply_accept_') |

| interaction.customId.startsWith('apply_deny_')) {
        await handleReviewAction(interaction);
        return;
      }
    } catch (error) {
      logger.error('Application button error', error);
      if (!interaction.replied &&!interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred processing this application button!', ephemeral: true }).catch(() => { });
      }
    }
  }

  if (interaction.isModalSubmit()) {
    try {
      const { handleModalSubmit } = require('./utils/applySystem');
      if (interaction.customId === 'apply_modal_submit') {
        await handleModalSubmit(interaction);
        return;
      }
    } catch (error) {
      logger.error('Modal submit error', error);
      if (!interaction.replied &&!interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to submit application!', ephemeral: true }).catch(() => { });
      }
    }

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
  }

  // --- HELP MENU INTERACTION ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
    try {
      const helpCommand = client.commands.get('help');
      if (helpCommand && helpCommand.generateCategoryEmbed) {
        const categoryKey = interaction.values;
        const embed = await helpCommand.generateCategoryEmbed(categoryKey, client);
        await interaction.update({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Help menu interaction error', error);
    }
  }

  // --- PROMO SETUP INTERACTION ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'promo_setup_select') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const rank = interaction.values;

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

  if (interaction.isModalSubmit() && interaction.customId.startsWith('promo_setup_modal_')) {
    try {
      const rank = interaction.customId.replace('promo_setup_modal_', '');
      const points = parseInt(interaction.fields.getTextInputValue('promo_points'));
      const shifts = parseInt(interaction.fields.getTextInputValue('promo_shifts'));
      const consistency = parseInt(interaction.fields.getTextInputValue('promo_consistency'));
      const warnings = parseInt(interaction.fields.getTextInputValue('promo_warnings'));

      // FIXED: The formatting broke the '||' OR operator here. It's now fixed.
      if (isNaN(points) |

| isNaN(shifts) |
| isNaN(consistency) |
| isNaN(warnings)) {
        return interaction.reply({ content: '❌ Please enter valid numbers for all fields.', ephemeral: true });
      }

      // FIXED: Restored the database properties the formatter deleted
      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
           : points,
           : shifts,
           : consistency,
           : warnings
          }
        },
        { upsert: true }
      );

      const { createSuccessEmbed } = require('./utils/embeds');
      await interaction.reply({
        embeds:,
        ephemeral: true
      });
    } catch (error) {
      logger.error('Promo modal submit error', error);
      await interaction.reply({ content: '❌ An error occurred while saving configuration.', ephemeral: true }).catch(() => { });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  logger.info(`${interaction.commandName} called by ${interaction.user.id} (${interaction.user.tag})`);

  const hasAccess = await versionGuard.checkAccess(
    interaction.guildId,
    interaction.user.id,
    command.requiredVersion
  );

  logger.info(`Access result: ${JSON.stringify(hasAccess)}`);

  if (!hasAccess.allowed) {
    return interaction.reply({
      content: '💎 **Premium Required**\n\nThis bot requires **Premium** or **Enterprise** access.\n\n✅ **Premium unlocks:** v3, v4, v5 commands (this bot)\n🌟 **Enterprise unlocks:** v6, v7, v8 commands (all bots)\n\nUse `/buy` or `/premium` in the **Strata1 Bot** to upgrade!',
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
  const cooldownAmount = (command.cooldown? command.cooldown : defaultCooldownDuration) * 1000;

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
    logger.error('Command execution error', error);
    const reply = {
      content: 'There was an error executing this command!',
      ephemeral: true
    };
    const hasReplied = interaction.replied? true : interaction.deferred;
    if (hasReplied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

const app = express();
app.locals.client = client;
app.use(express.json());
app.use(require('helmet')());
app.use(require('cors')());

const limiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

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
app.use('/webhooks', require('./webhook/paymentWebhook'));

const PORT = process.env.PORT? process.env.PORT : 3001;
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