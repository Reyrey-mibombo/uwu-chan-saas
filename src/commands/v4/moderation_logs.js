const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_logs')
    .setDescription('View moderation logs'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Moderation logs will be displayed here.' });
  }
};
