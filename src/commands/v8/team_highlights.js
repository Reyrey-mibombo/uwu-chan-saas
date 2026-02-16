const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('team_highlights').setDescription('View team highlights'),
  async execute(interaction) { await interaction.reply({ content: 'Team highlights displayed' }); }
};
