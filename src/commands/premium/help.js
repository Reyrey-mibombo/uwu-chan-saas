const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

function getCommandsList() {
  const commandsPath = path.join(__dirname, '../../commands');
  const versions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
  const result = {};
  
  for (const version of versions) {
    const versionPath = path.join(commandsPath, version);
    if (!fs.existsSync(versionPath)) continue;
    
    const files = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    const cmds = files.map(f => {
      try {
        const cmd = require(path.join(versionPath, f));
        return cmd.data?.name || f.replace('.js', '');
      } catch (e) {
        return f.replace('.js', '');
      }
    });
    
    result[version] = cmds;
  }
  
  return result;
}

const commandsByVersion = getCommandsList();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(option =>
      option.setName('version')
        .setDescription('Show commands for specific version')
        .setRequired(false)
        .addChoices(
          { name: 'v1', value: 'v1' },
          { name: 'v2', value: 'v2' },
          { name: 'v3', value: 'v3' },
          { name: 'v4', value: 'v4' },
          { name: 'v5', value: 'v5' },
          { name: 'v6', value: 'v6' },
          { name: 'v7', value: 'v7' },
          { name: 'v8', value: 'v8' }
        )),

  async execute(interaction, client) {
    const selectedVersion = interaction.options.getString('version');
    
    if (selectedVersion) {
      const cmds = commandsByVersion[selectedVersion] || [];
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${selectedVersion.toUpperCase()} Commands`)
        .setColor(0x3498db)
        .setDescription(cmds.length > 0 ? cmds.map(c => `\`&${c}\``).join('\n') : 'No commands available')
        .setFooter({ text: 'Use & prefix for these commands' });
      
      return interaction.reply({ embeds: [embed] });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands')
      .setColor(0x3498db)
      .setDescription('**How to use:**\nPrefix: `&command`\nPremium: `/command`\n\nUse `/help version` to see specific version commands')
      .addFields(
        { name: '🔹 v1 Commands', value: (commandsByVersion.v1 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v1?.length > 10 ? `\n+${commandsByVersion.v1.length - 10} more` : ''), inline: false },
        { name: '🔹 v2 Commands', value: (commandsByVersion.v2 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v2?.length > 10 ? `\n+${commandsByVersion.v2.length - 10} more` : ''), inline: false },
        { name: '🔹 v3 Commands', value: (commandsByVersion.v3 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v3?.length > 10 ? `\n+${commandsByVersion.v3.length - 10} more` : ''), inline: false },
        { name: '🔹 v4 Commands', value: (commandsByVersion.v4 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v4?.length > 10 ? `\n+${commandsByVersion.v4.length - 10} more` : ''), inline: false },
        { name: '🔹 v5 Commands', value: (commandsByVersion.v5 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v5?.length > 10 ? `\n+${commandsByVersion.v5.length - 10} more` : ''), inline: false },
        { name: '🔹 v6 Commands', value: (commandsByVersion.v6 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v6?.length > 10 ? `\n+${commandsByVersion.v6.length - 10} more` : ''), inline: false },
        { name: '🔹 v7 Commands', value: (commandsByVersion.v7 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v7?.length > 10 ? `\n+${commandsByVersion.v7.length - 10} more` : ''), inline: false },
        { name: '🔹 v8 Commands', value: (commandsByVersion.v8 || []).slice(0, 10).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v8?.length > 10 ? `\n+${commandsByVersion.v8.length - 10} more` : ''), inline: false },
        { name: '💎 Premium Commands', value: '`/premium` - View plans\n`/buy` - Purchase\n`/activate` - Activate\n`/help` - This help', inline: false }
      )
      .setFooter({ text: 'Uwu-chan Bot' });

    await interaction.reply({ embeds: [embed] });
  }
};
