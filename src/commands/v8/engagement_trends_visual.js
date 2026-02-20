const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends_visual')
    .setDescription('View engagement trends visually'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Engagement Trends Visual')
      .setDescription('```\nWeek 1  ↗↗↗↗\nWeek 2  ↗↗↗↗↗\nWeek 3  ↗↗↗↗↗↗\nWeek 4  ↗↗↗↗↗↗↗\n```\n+25% Growth')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
