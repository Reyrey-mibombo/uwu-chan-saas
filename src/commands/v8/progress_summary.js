const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_summary').setDescription('View progress summary'),
  async execute(interaction) { await interaction.reply({ content: 'Progress summary: 75% complete' }); }
};
