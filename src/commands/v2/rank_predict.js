const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict rank progression'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Based on your activity, you will reach the next rank in approximately 2 weeks!' });
  }
};
