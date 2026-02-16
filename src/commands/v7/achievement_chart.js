const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('achievement_chart').setDescription('View achievement chart'),
  async execute(interaction) { await interaction.reply({ content: 'Achievement chart displayed' }); }
};
