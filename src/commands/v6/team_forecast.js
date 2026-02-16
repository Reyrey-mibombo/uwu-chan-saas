const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('team_forecast').setDescription('View team forecast'),
  async execute(interaction) { await interaction.reply({ content: 'Team forecast: Positive' }); }
};
