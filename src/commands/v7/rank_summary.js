const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rank_summary').setDescription('View rank summary'),
  async execute(interaction) { await interaction.reply({ content: 'Rank summary displayed' }); }
};
