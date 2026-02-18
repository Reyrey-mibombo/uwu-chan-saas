const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

const commandsPath = path.join(__dirname, '../commands');

const prefixCommands = {
  v1: [],
  v2: [],
  v3: [],
  v4: [],
  v5: [],
  v6: [],
  v7: [],
  v8: []
};

function loadPrefixCommands() {
  const versions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
    if (!fs.existsSync(versionPath)) continue;
    
    const commandFiles = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(versionPath, file));
        if ('execute' in command) {
          const cmdName = command.data?.name || file.replace('.js', '');
          prefixCommands[version].push({
            name: cmdName,
            command: command
          });
        }
      } catch (e) {
        console.error(`Error loading ${file}: ${e.message}`);
      }
    }
  }
  
  console.log('Loaded prefix commands:', Object.entries(prefixCommands).map(([k,v]) => `${k}: ${v.length}`).join(', '));
}

loadPrefixCommands();

module.exports = {
  prefixCommands,
  handleMessage: async function(message, client, versionGuard) {
    if (message.author.bot) return;
    if (!message.content.startsWith('&')) return;
    
    const args = message.content.slice(1).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    
    if (!cmdName) return;
    
    for (const [version, commands] of Object.entries(prefixCommands)) {
      const cmd = commands.find(c => c.name.toLowerCase() === cmdName);
      
      if (cmd) {
        const hasAccess = await versionGuard.checkAccess(
          message.guildId,
          message.author.id,
          version
        );
        
        if (!hasAccess.allowed) {
          return message.reply({ content: hasAccess.message, ephemeral: true });
        }
        
        try {
          await cmd.command.execute(message, client, args);
        } catch (error) {
          console.error('Error executing prefix command:', error);
          message.reply('An error occurred while executing this command.');
        }
        return;
      }
    }
  }
};
