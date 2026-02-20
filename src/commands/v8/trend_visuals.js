const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_visuals')
    .setDescription('View trend visualizations'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Trend Visuals')
      .setDescription('```\nGrowth    ↗↗↗↗↗↗  +25%\nEngagement ↗↗↗↗    +15%\nRetention  ↗↗↗↗↗   +20%\n```')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
