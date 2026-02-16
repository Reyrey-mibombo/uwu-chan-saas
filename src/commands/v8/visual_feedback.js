const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('visual_feedback').setDescription('View visual feedback'),
  async execute(interaction) { await interaction.reply({ content: 'Visual feedback displayed' }); }
};
