const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('monthly_forecast').setDescription('View monthly forecast'),
  async execute(interaction) { await interaction.reply({ content: 'Monthly forecast: Growth expected' }); }
};
