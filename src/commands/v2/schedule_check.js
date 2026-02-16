const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule_check')
    .setDescription('Check your schedule'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Your scheduled shifts: Mon 9AM, Wed 9AM, Fri 9AM' });
  }
};
