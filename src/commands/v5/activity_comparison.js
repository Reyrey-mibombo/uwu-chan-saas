const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_comparison').setDescription('Compare activity'),
  async execute(interaction) { await interaction.reply({ content: 'Activity comparison displayed' }); }
};
