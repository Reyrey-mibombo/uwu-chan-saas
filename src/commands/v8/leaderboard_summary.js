const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('View leaderboard summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard Summary')
      .setDescription('Top 10 this season:\n1. User1 - 5000\n2. User2 - 4500\n3. User3 - 4000\n...')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
