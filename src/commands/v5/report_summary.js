const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('report_summary').setDescription('View report summary'),
  async execute(interaction) { await interaction.reply({ content: 'Report summary generated' }); }
};
