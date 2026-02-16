const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('alerts_dashboard').setDescription('View alerts dashboard'),
  async execute(interaction) { await interaction.reply({ content: 'Alerts dashboard displayed' }); }
};
