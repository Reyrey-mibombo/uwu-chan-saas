const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_remind').setDescription('Configure auto reminders'),
  async execute(interaction) { await interaction.reply('Auto remind configured!'); }
};
