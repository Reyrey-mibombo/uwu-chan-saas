const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_patterns').setDescription('View activity patterns'),
  async execute(interaction) { await interaction.reply({ content: 'Activity patterns displayed' }); }
};
