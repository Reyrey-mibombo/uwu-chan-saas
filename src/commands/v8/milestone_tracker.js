const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('milestone_tracker').setDescription('Track milestones'),
  async execute(interaction) { await interaction.reply({ content: 'Milestone tracker: 3/10' }); }
};
