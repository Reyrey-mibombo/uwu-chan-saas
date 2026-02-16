const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('top_performers').setDescription('View top performers'),
  async execute(interaction) { await interaction.reply({ content: 'Top performers displayed' }); }
};
