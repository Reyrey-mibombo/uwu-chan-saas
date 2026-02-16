const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('forecast').setDescription('View forecast'),
  async execute(interaction) { await interaction.reply({ content: 'Forecast: Positive growth expected' }); }
};
