const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('trend_report').setDescription('View trend report'),
  async execute(interaction) { await interaction.reply({ content: 'Trend report generated' }); }
};
