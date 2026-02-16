const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('priority_alerts').setDescription('Configure priority alerts'),
  async execute(interaction) { await interaction.reply('Priority alerts configured!'); }
};
