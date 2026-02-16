const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check activity logs'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Use /activity_log for activity details' });
  }
};
