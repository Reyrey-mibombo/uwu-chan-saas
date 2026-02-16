const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('View leaderboard summary'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Use /leaderboard for full details' });
  }
};
