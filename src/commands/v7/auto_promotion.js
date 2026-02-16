const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_promotion').setDescription('Configure auto promotion'),
  async execute(interaction) { await interaction.reply('Auto promotion configured!'); }
};
