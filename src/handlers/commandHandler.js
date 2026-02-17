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
      if (error.code === 50035) {
        logger.error('Description too long error. Checking commands...');
        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          const descLen = (cmd.description || '').length;
          logger.error(`Command ${i}: ${cmd.name} - description length: ${descLen}`);
          if (cmd.options) {
            for (const opt of cmd.options) {
              const optDescLen = (opt.description || '').length;
              if (optDescLen > 100) {
                logger.error(`  Option ${opt.name}: description length: ${optDescLen}`);
              }
            }
          }
        }
      }
      logger.error(error);
    }
  }
}

module.exports = new CommandHandler();
