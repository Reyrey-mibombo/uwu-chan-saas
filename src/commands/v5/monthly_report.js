const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('monthly_report').setDescription('View monthly report'),
  async execute(interaction) { await interaction.reply({ content: 'Monthly report generated' }); }
};
