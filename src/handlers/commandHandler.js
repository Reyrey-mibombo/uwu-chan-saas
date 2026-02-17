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
    const guildId = process.env.TEST_GUILD_ID;

    try {
      if (guildId) {
        logger.info(`Deploying ${commands.length} commands to guild...`);
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
          { body: commands }
        );
        logger.info(`Deployed ${commands.length} commands!`);
      } else {
        logger.info('No guild ID');
      }
    } catch (error) {
      logger.error('Deploy error: ' + error.message);
    }
  }
}

module.exports = new CommandHandler();
