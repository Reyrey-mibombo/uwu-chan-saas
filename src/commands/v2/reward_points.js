const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View reward points'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Your reward points: 250' });
  }
};
