const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advanced_logs')
    .setDescription('View advanced moderation logs'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Use /mod_notes for basic logs. Premium required for advanced logs.' });
  }
};
