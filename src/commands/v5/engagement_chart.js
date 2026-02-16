const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('engagement_chart').setDescription('View engagement chart'),
  async execute(interaction) { await interaction.reply({ content: 'Engagement chart displayed' }); }
};
