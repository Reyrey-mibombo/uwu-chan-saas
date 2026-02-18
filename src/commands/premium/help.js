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
    .setDescription('Show all available commands'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands')
      .setColor(0x3498db)
      .setDescription('**How to use:**\nUse `&` prefix before commands\n\n' +
        '**FREE (No Premium):** v1, v2\n' +
        '**PREMIUM:** v3, v4, v5\n' +
        '**ENTERPRISE:** v6, v7, v8\n\n' +
        'Use `/premium` to upgrade!')
      .addFields(
        { name: '🔹 v1 Commands (FREE)', value: (commandsByVersion.v1 || []).slice(0, 15).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v1?.length > 15 ? `\n+${commandsByVersion.v1.length - 15} more` : ''), inline: false },
        { name: '🔹 v2 Commands (FREE)', value: (commandsByVersion.v2 || []).slice(0, 15).map(c => `\`&${c}\``).join(', ') + (commandsByVersion.v2?.length > 15 ? `\n+${commandsByVersion.v2.length - 15} more` : ''), inline: false },
        { name: '💎 v3-v5 (Premium)', value: 'Requires Premium - Use `/premium` to buy', inline: false },
        { name: '🌟 v6-v8 (Enterprise)', value: 'Requires Enterprise - Use `/premium` to upgrade', inline: false }
      )
      .setFooter({ text: 'Uwu-chan Bot' });

    await interaction.reply({ embeds: [embed] });
  }
};
