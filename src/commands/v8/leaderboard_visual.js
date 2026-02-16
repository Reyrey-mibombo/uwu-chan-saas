const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard_visual').setDescription('View visual leaderboard'),
  async execute(interaction) { await interaction.reply({ content: 'Visual leaderboard displayed' }); }
};
