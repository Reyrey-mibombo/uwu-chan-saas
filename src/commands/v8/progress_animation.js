const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_animation').setDescription('View progress animation'),
  async execute(interaction) { await interaction.reply({ content: 'Progress animation displayed' }); }
};
