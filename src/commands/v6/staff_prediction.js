const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_prediction').setDescription('Predict staff performance'),
  async execute(interaction) { await interaction.reply({ content: 'Staff prediction: High performance expected' }); }
};
