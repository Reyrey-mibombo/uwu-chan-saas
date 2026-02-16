const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('trend_visuals').setDescription('View trend visuals'),
  async execute(interaction) { await interaction.reply({ content: 'Trend visuals displayed' }); }
};
