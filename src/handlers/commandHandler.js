const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

class CommandHandler {
  async deployCommands(client) {
    const commands = [];
    for (const [name, command] of client.commands) {
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      logger.info(`Started refreshing ${commands.length} application (/) commands.`);
      
      // Deploy in batches of 50 to avoid hitting limits
      const batchSize = 50;
      for (let i = 0; i < commands.length; i += batchSize) {
        const batch = commands.slice(i, i + batchSize);
        logger.info(`Deploying commands ${i+1} to ${Math.min(i+batchSize, commands.length)}...`);
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: batch }
        );
      }

      logger.info(`Successfully reloaded all ${commands.length} application (/) commands.`);
    } catch (error) {
      logger.error('Failed to deploy commands: ' + error.message);
      // Don't crash - just log the error
    }
  }
}

module.exports = new CommandHandler();
