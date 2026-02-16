const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_goal')
    .setDescription('Set or view staff goals'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Your current goal: Reach 500 points by end of month' });
  }
};
