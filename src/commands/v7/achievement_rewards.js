const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('achievement_rewards').setDescription('View achievement rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Achievement rewards: 5 unlocked' }); }
};
