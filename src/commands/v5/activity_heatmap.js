const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_heatmap').setDescription('View activity heatmap'),
  async execute(interaction) { await interaction.reply({ content: 'Activity heatmap displayed' }); }
};
