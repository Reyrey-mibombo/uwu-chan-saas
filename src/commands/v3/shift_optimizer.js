const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('shift_optimizer').setDescription('Optimize shift scheduling'),
  async execute(interaction) { await interaction.reply('Shift optimizer running...'); }
};
