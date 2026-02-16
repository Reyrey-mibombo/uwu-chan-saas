const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('automation_overview').setDescription('View automation overview'),
  async execute(interaction) { await interaction.reply({ content: 'Automation overview: 8 active' }); }
};
