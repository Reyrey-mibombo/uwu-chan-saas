const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('trend_alerts').setDescription('Configure trend alerts'),
  async execute(interaction) { await interaction.reply('Trend alerts configured!'); }
};
