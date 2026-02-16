const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('server_trends').setDescription('View server trends'),
  async execute(interaction) { await interaction.reply({ content: 'Server trends: Growing +5%' }); }
};
