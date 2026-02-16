const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('View analytics dashboard'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Analytics dashboard requires Premium subscription.' });
  }
};
