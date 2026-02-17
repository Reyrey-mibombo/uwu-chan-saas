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

    // Check for problems FIRST
    for (const cmd of commands) {
      if ((cmd.description || '').length > 100) logger.error(`TOOLONG CMD ${cmd.name}: ${cmd.description.length}`);
      if ((cmd.name || '').length > 32) logger.error(`CMD NAME TOOLONG ${cmd.name}: ${cmd.name.length}`);
      if (cmd.default_member_permissions && cmd.default_member_permissions.length > 100) logger.error(`CMD ${cmd.name}: perms too long`);
      if (cmd.options) {
        for (const opt of cmd.options) {
          if ((opt.description || '').length > 100) logger.error(`TOOLONG OPT ${cmd.name}.${opt.name}: ${opt.description.length}`);
          if ((opt.name || '').length > 32) logger.error(`OPT NAME TOOLONG ${cmd.name}.${opt.name}: ${opt.name.length}`);
        }
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      const guildId = process.env.TEST_GUILD_ID;
      
      // Deploy first 50 commands only
      const first50 = commands.slice(0, 50);
      
      if (guildId) {
        logger.info(`Deploying 50 commands to guild ${guildId}...`);
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
          { body: first50 }
        );
        logger.info(`Successfully deployed 50 commands!`);
      } else {
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: first50 }
        );
        logger.info('Deployed 50 commands globally');
      }
    } catch (error) {
      logger.error('Deploy error: ' + error.message);
    }
  }
}

module.exports = new CommandHandler();
