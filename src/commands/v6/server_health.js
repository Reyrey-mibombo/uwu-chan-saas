const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('server_health').setDescription('Check server health'),
  async execute(interaction) { await interaction.reply({ content: 'Server health: Good ✅' }); }
};
