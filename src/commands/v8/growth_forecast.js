const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('growth_forecast').setDescription('View growth forecast'),
  async execute(interaction) { await interaction.reply({ content: 'Growth forecast: +10%' }); }
};
