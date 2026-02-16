const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('data_alert').setDescription('Configure data alerts'),
  async execute(interaction) { await interaction.reply('Data alerts configured!'); }
};
