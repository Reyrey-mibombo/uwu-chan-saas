const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank')
    .setDescription('View staff rank information'),
  async execute(interaction) {
    await interaction.reply({ content: 'Use /leaderboard to view staff rankings' });
  }
};
