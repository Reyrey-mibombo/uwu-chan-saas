const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_activity')
    .setDescription('Check member activity'),
  async execute(interaction) {
    await interaction.reply({ content: 'Use /activity_log to view activity' });
  }
};
