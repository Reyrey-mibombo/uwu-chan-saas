const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('event_rewards').setDescription('View event rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Event rewards: 3 active' }); }
};
