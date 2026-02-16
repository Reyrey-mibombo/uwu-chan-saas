const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('analytics_summary').setDescription('View analytics summary'),
  async execute(interaction) { await interaction.reply({ content: 'Analytics summary generated' }); }
};
