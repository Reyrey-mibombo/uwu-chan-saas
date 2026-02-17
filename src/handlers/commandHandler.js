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
      logger.info(`Deploying ${commands.length} commands to TEST GUILD (faster than global)...`);
      
      // Deploy to a specific guild instead of globally (faster and no global limits)
      // Replace TEST_GUILD_ID with your server ID in Railway env vars
      const guildId = process.env.TEST_GUILD_ID;
      
      if (guildId) {
        const batchSize = 25;
        for (let i = 0; i < commands.length; i += batchSize) {
          const batch = commands.slice(i, i + batchSize);
          logger.info(`Deploying ${i+1}-${Math.min(i+batchSize, commands.length)}...`);
          await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
            { body: batch }
          );
          await new Promise(r => setTimeout(r, 1000)); // 1 second delay
        }
        logger.info(`Successfully deployed ${commands.length} commands to guild ${guildId}`);
      } else {
        // No guild ID - just deploy first 50 globally
        logger.info('No TEST_GUILD_ID set, deploying first 50 commands globally...');
        const first50 = commands.slice(0, 50);
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: first50 }
        );
        logger.info('Deployed first 50 commands globally');
      }
    } catch (error) {
      logger.error('Deploy error: ' + error.message);
    }
  }
}

module.exports = new CommandHandler();
