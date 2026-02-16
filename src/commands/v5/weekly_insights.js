const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('weekly_insights').setDescription('View weekly insights'),
  async execute(interaction) { await interaction.reply({ content: 'Weekly insights generated' }); }
};
