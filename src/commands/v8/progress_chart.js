const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_chart').setDescription('View progress chart'),
  async execute(interaction) { await interaction.reply({ content: 'Progress chart displayed' }); }
};
