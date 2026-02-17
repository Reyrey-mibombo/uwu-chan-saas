const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

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
  
  // Read from .env file manually
  const envPath = path.join(__dirname, '.env');
  let DISCORD_TOKEN = '', CLIENT_ID = '', TEST_GUILD_ID = '';
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.startsWith('DISCORD_TOKEN=')) DISCORD_TOKEN = line.split('=')[1].trim();
      if (line.startsWith('CLIENT_ID=')) CLIENT_ID = line.split('=')[1].trim();
      if (line.startsWith('TEST_GUILD_ID=')) TEST_GUILD_ID = line.split('=')[1].trim();
    });
  }
  
  console.log('DISCORD_TOKEN:', DISCORD_TOKEN ? 'set' : 'NOT SET');
  console.log('CLIENT_ID:', CLIENT_ID ? 'set' : 'NOT SET');
  console.log('TEST_GUILD_ID:', TEST_GUILD_ID ? 'set' : 'NOT SET');
  
  if (!DISCORD_TOKEN || !CLIENT_ID || !TEST_GUILD_ID) {
    console.log('\nERROR: Missing values in .env file');
    return;
  }
  
  const rest = new REST({ version: '10', timeout: 30000 }).setToken(DISCORD_TOKEN);
  
  try {
    console.log(`Deploying ${commands.length} commands globally...`);
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log(`SUCCESS! Deployed ${commands.length} commands!`);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

deploy();
