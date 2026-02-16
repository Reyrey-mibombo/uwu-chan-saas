const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('smart_alerts').setDescription('Configure smart alerts'),
  async execute(interaction) { await interaction.reply('Smart alerts configured!'); }
};
