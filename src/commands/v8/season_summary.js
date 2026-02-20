const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_summary')
    .setDescription('View season summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏅 Season Summary')
      .setDescription('**Winter 2026**\n• Participants: 150\n• Top Score: 5000 pts\n• Total Rewards: $5000')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
