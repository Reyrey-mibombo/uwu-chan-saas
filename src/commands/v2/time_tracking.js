const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track time spent on duties'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Time tracking: 45 hours this week' });
  }
};
