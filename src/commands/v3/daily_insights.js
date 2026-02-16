const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('daily_insights').setDescription('View daily insights'),
  async execute(interaction) { await interaction.reply({ content: 'Daily insights generated' }); }
};
