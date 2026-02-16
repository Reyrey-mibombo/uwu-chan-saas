const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('prediction_graph').setDescription('View prediction graph'),
  async execute(interaction) { await interaction.reply({ content: 'Prediction graph displayed' }); }
};
