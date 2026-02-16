const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('efficiency_chart').setDescription('View efficiency chart'),
  async execute(interaction) { await interaction.reply({ content: 'Efficiency chart displayed' }); }
};
