const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify_staff')
    .setDescription('Notify staff members'),
  async execute(interaction) {
    await interaction.reply('Staff notified!');
  }
};
