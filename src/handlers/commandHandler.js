const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger'); // Assumes you have your custom logger

function loadCommands() {
  const { Collection } = require('discord.js');
  const commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');

  // Essential v1 commands (core functionality) - max 20
  const essentialV1 = [
    'help.js', 'setup.js', 'rank.js', 'stats.js', 'profile.js',
    'warn.js', 'kick.js', 'ban.js', 'mute.js', 'unmute.js',
    'shift_start.js', 'shift_end.js', 'add_points.js', 'remove_points.js',
    'ticketSetup.js', 'promo_setup.js', 'config_server.js',
    'auto_rank_up.js', 'staff_profile.js', 'view_warns.js'
  ];

  const v1Path = path.join(commandsPath, 'v1');
  if (fs.existsSync(v1Path)) {
    for (const file of essentialV1) {
      try {
        const filePath = path.join(v1Path, file);
        if (!fs.existsSync(filePath)) continue;
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading v1 command ${file}: ${e.message}`);
      }
    }
  }

  // Essential v2 commands (staff tools) - max 15
  const essentialV2 = [
    'points.js', 'profile_card.js', 'commend.js', 'promo_progress.js',
    'nextPromotion.js', 'burnout_check.js', 'badges.js', 'mastery.js',
    'bonus_points.js', 'addReputation.js', 'checkRequirements.js',
    'progress_report.js', 'activity_alert.js', 'promo_list.js', 'apply_setup.js'
  ];

  const v2Path = path.join(commandsPath, 'v2');
  if (fs.existsSync(v2Path)) {
    for (const file of essentialV2) {
      try {
        const filePath = path.join(v2Path, file);
        if (!fs.existsSync(filePath)) continue;
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading v2 command ${file}: ${e.message}`);
      }
    }
  }

  // Essential v3 commands (premium analytics) - max 9
  const essentialV3 = [
    'leaderboards.js', 'performance_score.js', 'detailed_profile.js',
    'promotion_predictor.js', 'attendance_summary.js', 'efficiency_chart.js',
    'achievement_tracker.js', 'auto_remind.js', 'priority_alerts.js'
  ];

  const v3Path = path.join(commandsPath, 'v3');
  if (fs.existsSync(v3Path)) {
    for (const file of essentialV3) {
      try {
        const filePath = path.join(v3Path, file);
        if (!fs.existsSync(filePath)) continue;
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading v3 command ${file}: ${e.message}`);
      }
    }
  }

  // Load v1_context (context menus) - max 2
  const v1ContextPath = path.join(commandsPath, 'v1_context');
  if (fs.existsSync(v1ContextPath)) {
    const contextFiles = fs.readdirSync(v1ContextPath).filter(f => f.endsWith('.js'));
    for (const file of contextFiles.slice(0, 2)) {
      try {
        const filePath = path.join(v1ContextPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading context command ${file}: ${e.message}`);
      }
    }
  }

  // Load buying commands (all 3)
  const buyingPath = path.join(commandsPath, 'buying');
  if (fs.existsSync(buyingPath)) {
    const buyingFiles = fs.readdirSync(buyingPath).filter(f => f.endsWith('.js'));
    for (const file of buyingFiles) {
      try {
        const filePath = path.join(buyingPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading buying command ${file}: ${e.message}`);
      }
    }
  }

  // Load consolidated commands (replaces v6/v7/v8) - 7 commands
  const consolidatedPath = path.join(commandsPath, 'consolidated');
  if (fs.existsSync(consolidatedPath)) {
    const consolidatedFiles = fs.readdirSync(consolidatedPath).filter(f => f.endsWith('.js'));
    for (const file of consolidatedFiles) {
      try {
        const filePath = path.join(consolidatedPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading consolidated ${file}: ${e.message}`);
      }
    }
  }

  console.log(`Loaded ${commands.size} commands for deployment (target: <=100)`);
  return commands;
}

class CommandHandler {
  async deployCommands(client, guildId = null) {
    const commands = Array.from(client.commands.values()).map(c => c.data.toJSON());
    const rest = new REST({ timeout: 120000 }).setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.CLIENT_ID;
    const token = process.env.DISCORD_TOKEN;

    logger.info(` Token length: ${token?.length || 0}, ClientID: ${clientId || 'NOT SET'}, GuildID: ${guildId || 'global'}`);
    logger.info(` Commands to deploy: ${commands.length}`);

    if (!clientId) {
      logger.error(' CLIENT_ID not set in environment variables');
      return;
    }

    if (!token) {
      logger.error(' DISCORD_TOKEN not set');
      return;
    }

    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    logger.info(` Route: ${route}`);

    try {
      const result = await rest.put(route, { body: commands });
      logger.info(` SUCCESS! Deployed ${result.length} commands ${guildId ? 'to guild' : 'globally'}`);
    } catch (error) {
      logger.error(` Error: ${error.message}`);
      if (error.code) logger.error(` Error code: ${error.code}`);
      if (error.status) logger.error(` HTTP status: ${error.status}`);
    }
  }
}

module.exports = new CommandHandler();

// --- EXECUTION BLOCK ---
// This ensures the script actually runs when executed directly via terminal
if (require.main === module) {
  // Load environment variables for local testing
  require('dotenv').config();

  const handler = new CommandHandler();
  const commandsMap = loadCommands();

  // Mock client specifically for deployment
  const mockClient = { commands: commandsMap };

  // Pass null to force GLOBAL deployment to all servers
  handler.deployCommands(mockClient, null)
    .then(() => {
      console.log("Deployment script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deployment failed:", err);
      process.exit(1);
    });
}