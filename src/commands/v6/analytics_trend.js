const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('analytics_trend').setDescription('View analytics trend'),
  async execute(interaction) { await interaction.reply({ content: 'Analytics trend: Upward 📈' }); }
};
