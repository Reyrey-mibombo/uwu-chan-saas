const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger'); // Assumes you have your custom logger

function loadCommands() {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');
  const defaultVersions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'premium'];
  const versions = process.env.ENABLED_TIERS ? process.env.ENABLED_TIERS.split(',') : defaultVersions;

  for (const version of versions) {
    const versionPath = path.join(commandsPath, version.trim());
    if (!fs.existsSync(versionPath)) continue;

    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(versionPath, file));
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
        }
      } catch (e) {
        console.error(`Error loading ${file}: ${e.message}`);
      }
    }
  }
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