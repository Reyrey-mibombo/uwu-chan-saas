const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('performance_stats').setDescription('View performance stats'),
  async execute(interaction) { await interaction.reply({ content: 'Performance stats: 88%' }); }
};
