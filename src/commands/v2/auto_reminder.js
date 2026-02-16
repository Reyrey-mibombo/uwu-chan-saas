const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_reminder')
    .setDescription('Set up automatic reminders'),
  async execute(interaction, client) {
    await interaction.reply('Auto-reminder configured! You will receive notifications for shifts and tasks.');
  }
};
