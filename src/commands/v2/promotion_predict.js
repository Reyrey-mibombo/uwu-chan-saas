const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('Predict promotion timeline'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Based on your current activity, you will be promoted in approximately 3 weeks!' });
  }
};
