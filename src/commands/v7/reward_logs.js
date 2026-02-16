const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('reward_logs').setDescription('View reward logs'),
  async execute(interaction) { await interaction.reply({ content: 'Reward logs displayed' }); }
};
