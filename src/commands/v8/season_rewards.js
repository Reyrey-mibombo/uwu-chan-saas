const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('season_rewards').setDescription('View season rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Season rewards: 5 available' }); }
};
