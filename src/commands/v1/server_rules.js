const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_rules')
    .setDescription('View server rules'),

  async execute(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guildId });
    const rules = guildData?.settings?.rules || [
      '1. Be respectful to others',
      '2. No spam or advertising',
      '3. Follow Discord Terms of Service',
      '4. Listen to staff members',
      '5. No inappropriate content'
    ];
    
    const embed = new EmbedBuilder()
      .setTitle('📜 Server Rules')
      .setDescription(rules.join('\n'))
      .setColor('#e74c3c');

    await interaction.reply({ embeds: [embed] });
  }
};
