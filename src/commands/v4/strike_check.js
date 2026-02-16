const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('strike_check').setDescription('Check user strikes'),
  async execute(interaction) { await interaction.reply({ content: 'User has 2 strikes' }); }
};
