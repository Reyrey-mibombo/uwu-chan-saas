const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View activity chart'),
  async execute(interaction) {
    await interaction.reply({ content: 'Activity chart will be displayed here.' });
  }
};
