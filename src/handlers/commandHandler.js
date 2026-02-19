const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function loadCommands() {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');
  const versions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'premium'];
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
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
    
    if (!clientId) {
      logger.error('CLIENT_ID not set in environment variables');
      return;
    }
    
    const route = guildId 
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);
    
    try {
      await rest.put(route, { body: commands });
      logger.info(`Deployed ${commands.length} commands ${guildId ? 'to guild' : 'globally'}`);
    } catch (error) {
      logger.error('Deploy error: ' + error.message);
      throw error;
    }
  }
}

module.exports = new CommandHandler();
