const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rank_chart').setDescription('View rank chart'),
  async execute(interaction) { await interaction.reply({ content: 'Rank chart displayed' }); }
};
