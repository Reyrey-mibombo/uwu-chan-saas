const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_trend')
    .setDescription('View analytics trends'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Analytics Trend')
      .setDescription('30-day trend analysis:')
      .addFields(
        { name: 'Growth', value: '+18%', inline: true },
        { name: 'Engagement', value: '+12%', inline: true },
        { name: 'Retention', value: '+8%', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
