const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('analytics_export').setDescription('Export analytics'),
  async execute(interaction) { await interaction.reply({ content: 'Analytics exported!' }); }
};
