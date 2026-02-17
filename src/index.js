const { Client, GatewayIntentBits, Collection, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const { versionGuard } = require('./guards/versionGuard');
const LicenseSystem = require('./systems/licenseSystem');
const commandHandler = require('./handlers/commandHandler');

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
  
  const systemsDir = path.join(__dirname, 'systems');
  const systemFiles = fs.readdirSync(systemsDir).filter(f => f.endsWith('.js') && f !== 'licenseSystem.js');
  
  for (const file of systemFiles) {
    const SystemClass = require(path.join(systemsDir, file));
    const systemName = file.replace('.js', '');
    client.systems[systemName] = new SystemClass(client);
    await client.systems[systemName].initialize();
  }
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const versions = ['v1', 'v2'];
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
    if (!fs.existsSync(versionPath)) continue;
    
    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(versionPath, file));
        if ('data' in command && 'execute' in command) {
          command.requiredVersion = version;
          client.commands.set(command.data.name, command);
        }
      } catch (e) {
        logger.error(`Error loading command ${file}: ${e.message}`);
      }
    }
  }
  logger.info(`Loaded ${client.commands.size} commands`);
}

client.once('ready', async () => {
  logger.info(`Bot logged in as ${client.user.tag}`);
  await initializeSystems();
  await loadCommands();
  await commandHandler.deployCommands(client);
  
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
      content: hasAccess.message, 
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
    logger.error(error);
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
    version: '8.0.0'
  });
});

app.use('/api/licenses', require('./api/licenses'));
app.use('/api/guilds', require('./api/guilds'));
app.use('/webhooks', require('./webhook/paymentWebhook'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN)
  .catch(err => {
    logger.error('Discord login error:', err);
    process.exit(1);
  });

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});
