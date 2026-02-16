const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_summary').setDescription('View activity summary'),
  async execute(interaction) { await interaction.reply({ content: 'Activity summary generated' }); }
};
