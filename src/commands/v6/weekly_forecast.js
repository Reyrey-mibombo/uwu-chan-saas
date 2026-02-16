const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('weekly_forecast').setDescription('View weekly forecast'),
  async execute(interaction) { await interaction.reply({ content: 'Weekly forecast: Stable' }); }
};
