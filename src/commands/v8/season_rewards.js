const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_rewards')
    .setDescription('View current season rewards'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏅 Season Rewards')
      .setDescription('Current Season: Winter 2026\n• 1st Place: 5000 pts + Gold Badge\n• 2nd Place: 3000 pts + Silver Badge\n• 3rd Place: 1000 pts + Bronze Badge')
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
