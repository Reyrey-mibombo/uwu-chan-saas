const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('message_filter').setDescription('Configure message filter'),
  async execute(interaction) { await interaction.reply('Message filter configured!'); }
};
