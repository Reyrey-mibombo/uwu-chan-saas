const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_promotion_visual').setDescription('View auto promotion visual'),
  async execute(interaction) { await interaction.reply({ content: 'Auto promotion visual displayed' }); }
};
