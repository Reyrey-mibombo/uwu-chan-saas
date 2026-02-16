const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('performance_reports').setDescription('View performance reports'),
  async execute(interaction) { await interaction.reply({ content: 'Performance reports displayed' }); }
};
