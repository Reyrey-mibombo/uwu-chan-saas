const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('milestone_summary').setDescription('View milestone summary'),
  async execute(interaction) { await interaction.reply({ content: 'Milestone summary: 3/10 completed' }); }
};
