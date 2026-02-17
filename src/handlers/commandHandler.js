const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function loadCommands() {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');
  const versions = ['v1', 'v2', 'premium'];
  
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
  async deployCommands(client) {
    const commands = client 
      ? Array.from(client.commands.values()).map(c => c.data.toJSON())
      : Array.from(loadCommands().values()).map(c => c.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      logger.info(`Deploying ${commands.length} commands globally...`);
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      logger.info(`SUCCESS: Deployed ${commands.length} commands!`);
    } catch (error) {
      logger.error('Deploy error: ' + error.message);
    }
  }
}

module.exports = new CommandHandler();
