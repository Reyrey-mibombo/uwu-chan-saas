const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_score')
    .setDescription('View staff performance score'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Your staff score: 85/100' });
  }
};
