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
      const guildId = process.env.TEST_GUILD_ID;
      
      if (guildId) {
        logger.info(`Deploying all ${commands.length} commands to guild ${guildId}...`);
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
          { body: commands }
        );
        logger.info(`Successfully deployed ${commands.length} commands!`);
      } else {
        logger.info('No TEST_GUILD_ID - deploying first 100 globally...');
        const first100 = commands.slice(0, 100);
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: first100 }
        );
        logger.info('Deployed 100 commands');
      }
    } catch (error) {
      // Find which command has the problem
      for (const cmd of commands) {
        if ((cmd.description || '').length > 100) logger.error(`CMD ${cmd.name}: desc=${cmd.description.length}`);
        if (cmd.options) {
          for (const opt of cmd.options) {
            if ((opt.description || '').length > 100) logger.error(`CMD ${cmd.name} OPT ${opt.name}: desc=${opt.description.length}`);
            if (opt.choices) {
              for (const c of opt.choices) {
                if ((c.name || '').length > 100) logger.error(`CMD ${cmd.name} OPT ${opt.name} CHOICE: name=${c.name.length}`);
              }
            }
          }
        }
      }
      logger.error('Deploy error: ' + error.message);
    }
  }
}

module.exports = new CommandHandler();
