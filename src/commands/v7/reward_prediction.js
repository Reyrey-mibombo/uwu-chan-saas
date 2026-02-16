const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('reward_prediction').setDescription('Predict rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Reward prediction: +300 points expected' }); }
};
