const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('View leaderboard summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Staff Leaderboard')
      .setDescription('Top 5 staff members this week:')
      .addFields(
        { name: '1. User1', value: '200 pts', inline: false },
        { name: '2. User2', value: '180 pts', inline: false },
        { name: '3. User3', value: '165 pts', inline: false },
        { name: '4. User4', value: '150 pts', inline: false },
        { name: '5. User5', value: '140 pts', inline: false }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
