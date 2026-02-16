const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('recommendation_summary').setDescription('View recommendations'),
  async execute(interaction) { await interaction.reply({ content: 'Recommendations: 5 items' }); }
};
