const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('reward_flow').setDescription('View reward flow'),
  async execute(interaction) { await interaction.reply({ content: 'Reward flow displayed' }); }
};
