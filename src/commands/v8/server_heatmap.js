const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('server_heatmap').setDescription('View server heatmap'),
  async execute(interaction) { await interaction.reply({ content: 'Server heatmap displayed' }); }
};
