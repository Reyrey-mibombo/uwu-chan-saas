const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_graph').setDescription('View activity graph'),
  async execute(interaction) { await interaction.reply({ content: 'Activity graph displayed' }); }
};
