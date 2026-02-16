const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_points')
    .setDescription('View bonus point opportunities'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Earn bonus points by completing tasks and events!' });
  }
};
