const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('engagement_score').setDescription('View engagement score'),
  async execute(interaction) { await interaction.reply({ content: 'Engagement score: 85/100' }); }
};
