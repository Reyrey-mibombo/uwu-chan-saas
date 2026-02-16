const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('visual_leaderboard').setDescription('View visual leaderboard'),
  async execute(interaction) { await interaction.reply({ content: 'Visual leaderboard displayed' }); }
};
