const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('team_ranking').setDescription('View team ranking'),
  async execute(interaction) { await interaction.reply({ content: 'Team ranking displayed' }); }
};
