const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('prediction_summary').setDescription('View prediction summary'),
  async execute(interaction) { await interaction.reply({ content: 'Prediction summary: Positive' }); }
};
