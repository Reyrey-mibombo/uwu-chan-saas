const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('server_overview').setDescription('View server overview'),
  async execute(interaction) { await interaction.reply({ content: 'Server overview displayed' }); }
};
