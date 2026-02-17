const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'src/commands');
  const versions = ['v1', 'v2', 'premium'];
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
    if (!fs.existsSync(versionPath)) continue;
    
    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(versionPath, file));
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
        }
      } catch (e) {
        console.error(`Error loading ${file}: ${e.message}`);
      }
    }
  }
  return commands;
}

async function deploy() {
  const commands = loadCommands();
  console.log(`Loaded ${commands.length} commands`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.TEST_GUILD_ID;
  
  if (!guildId) {
    console.log('ERROR: TEST_GUILD_ID not set in .env file');
    console.log('Add this to your .env file: TEST_GUILD_ID=1459564006334533804');
    return;
  }
  
  try {
    console.log(`Deploying to guild ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commands }
    );
    console.log(`SUCCESS! Deployed ${commands.length} commands to your server!`);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

deploy();
