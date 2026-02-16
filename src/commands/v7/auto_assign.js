const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_assign').setDescription('Configure auto assign'),
  async execute(interaction) { await interaction.reply('Auto assign configured!'); }
};
