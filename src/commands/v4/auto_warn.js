const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_warn').setDescription('Configure auto warn'),
  async execute(interaction) { await interaction.reply('Auto warn configured!'); }
};
