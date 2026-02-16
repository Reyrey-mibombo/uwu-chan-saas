const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('leaderboards').setDescription('View leaderboards'),
  async execute(interaction) { await interaction.reply({ content: 'Use /leaderboard for details' }); }
};
