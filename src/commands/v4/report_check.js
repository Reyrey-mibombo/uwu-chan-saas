const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('report_check').setDescription('Check reports'),
  async execute(interaction) { await interaction.reply({ content: 'Reports: 3 pending' }); }
};
