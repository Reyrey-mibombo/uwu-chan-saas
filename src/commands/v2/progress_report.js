const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_report').setDescription('View progress report'),
  async execute(interaction) { await interaction.reply({ content: 'Progress: 75% complete' }); }
};
