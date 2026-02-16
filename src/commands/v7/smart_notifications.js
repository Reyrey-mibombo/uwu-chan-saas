const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('smart_notifications').setDescription('Configure smart notifications'),
  async execute(interaction) { await interaction.reply('Smart notifications configured!'); }
};
