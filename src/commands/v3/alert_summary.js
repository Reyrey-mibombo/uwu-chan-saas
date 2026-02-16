const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('alert_summary').setDescription('View alert summary'),
  async execute(interaction) { await interaction.reply({ content: 'Alert summary: 3 active alerts' }); }
};
