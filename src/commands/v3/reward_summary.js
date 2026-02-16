const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('reward_summary').setDescription('View reward summary'),
  async execute(interaction) { await interaction.reply({ content: 'Reward summary: 500 points earned' }); }
};
