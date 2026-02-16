const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('promotion_predictor').setDescription('Predict promotions'),
  async execute(interaction) { await interaction.reply({ content: 'Promotion predictor: ~2 weeks to next rank' }); }
};
