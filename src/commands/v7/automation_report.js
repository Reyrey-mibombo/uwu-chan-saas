const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('automation_report').setDescription('View automation report'),
  async execute(interaction) { await interaction.reply({ content: 'Automation report: 5 automations active' }); }
};
