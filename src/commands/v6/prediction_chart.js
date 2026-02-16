const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('prediction_chart').setDescription('View prediction chart'),
  async execute(interaction) { await interaction.reply({ content: 'Prediction chart displayed' }); }
};
