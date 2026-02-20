const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends')
    .setDescription('View engagement trends'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Engagement Trends')
      .setDescription('Last 30 days engagement analysis:')
      .addFields(
        { name: 'Messages', value: '+12%', inline: true },
        { name: 'Reactions', value: '+8%', inline: true },
        { name: 'Members', value: '+5%', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
