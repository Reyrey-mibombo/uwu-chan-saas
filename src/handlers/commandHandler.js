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
      
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );

      logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
      logger.error(error);
    }
  }
}

module.exports = new CommandHandler();
