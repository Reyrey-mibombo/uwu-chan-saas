const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('low_performance').setDescription('View low performance'),
  async execute(interaction) { await interaction.reply({ content: 'Low performance areas displayed' }); }
};
