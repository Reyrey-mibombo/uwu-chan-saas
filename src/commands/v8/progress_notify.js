const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_notify').setDescription('Notify progress'),
  async execute(interaction) { await interaction.reply('Progress notification sent!'); }
};
