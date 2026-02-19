const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const { versionGuard } = require('./guards/versionGuard');
const LicenseSystem = require('./systems/licenseSystem');
const commandHandler = require('./handlers/commandHandler');
const { Guild } = require('./database/mongo');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.systems = {};

async function initializeSystems() {
  client.systems.license = new LicenseSystem(client);
  await client.systems.license.initialize();
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  // STRATA 2: v3, v4, v5 (Premium tier commands)
  const versions = ['v3', 'v4', 'v5'];
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
    if (!fs.existsSync(versionPath)) continue;
    
    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        delete require.cache[require.resolve(path.join(versionPath, file))];
        const command = require(path.join(versionPath, file));
        if ('data' in command && 'execute' in command) {
          command.requiredVersion = version;
          client.commands.set(command.data.name, command);
        }
      } catch (e) {
        logger.error(`[STRATA2] Error loading command ${file}: ${e.message}`);
      }
    }
  }
  logger.info(`[STRATA2] Loaded ${client.commands.size} commands`);
}

client.once('ready', async () => {
  logger.info(`[STRATA2] Bot logged in as ${client.user.tag}`);
  await initializeSystems();
  await loadCommands();
  
  const testGuildId = process.env.TEST_GUILD_ID;
  await commandHandler.deployCommands(client, testGuildId || null).catch(e => logger.error('[STRATA2] Deploy error: ' + e.message));
  
  setInterval(() => client.systems.license.syncLicenses(), 60000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const hasAccess = await versionGuard.checkAccess(
    interaction.guildId, 
    interaction.userId, 
    command.requiredVersion
  );
  
  if (!hasAccess.allowed) {
    return interaction.reply({ 
      content: '💎 **Premium Required**\n\nThis bot requires **Premium** or **Enterprise** access.\n\n✅ **Premium unlocks:** v3, v4, v5 commands (this bot)\n🌟 **Enterprise unlocks:** v3-v8 commands (all bots)\n\nUse `/buy` or `/premium` in the **Strata1 Bot** to upgrade!', 
      ephemeral: true 
    });
  }

  const { cooldowns } = client;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);
      return interaction.reply({ 
        content: `Please wait, you are on cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, 
        ephemeral: true 
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction, client);
  } catch (error) {
    logger.error('[STRATA2]', error);
    const reply = { 
      content: 'There was an error executing this command!', 
      ephemeral: true 
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

const app = express();
app.use(express.json());
app.use(require('helmet')());
app.use(require('cors')());

const limiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '8.0.0',
    strata: 'strata2'
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('[STRATA2] Connected to MongoDB'))
  .catch(err => {
    logger.error('[STRATA2] MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`[STRATA2] API server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN)
  .catch(err => {
    logger.error('[STRATA2] Discord login error:', err);
    process.exit(1);
  });

process.on('unhandledRejection', error => {
  logger.error('[STRATA2] Unhandled promise rejection:', error);
});
