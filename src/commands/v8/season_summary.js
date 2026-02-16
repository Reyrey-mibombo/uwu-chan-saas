const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('season_summary').setDescription('View season summary'),
  async execute(interaction) { await interaction.reply({ content: 'Season summary: Day 45/90' }); }
};
