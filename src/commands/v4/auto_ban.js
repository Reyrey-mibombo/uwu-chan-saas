const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_ban').setDescription('Configure auto ban'),
  async execute(interaction) { await interaction.reply('Auto ban configured!'); }
};
