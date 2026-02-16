const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('event_summary').setDescription('View event summary'),
  async execute(interaction) { await interaction.reply({ content: 'Event summary: 3 events this month' }); }
};
