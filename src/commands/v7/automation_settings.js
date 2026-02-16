const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('automation_settings').setDescription('Configure automation settings'),
  async execute(interaction) { await interaction.reply('Automation settings configured!'); }
};
