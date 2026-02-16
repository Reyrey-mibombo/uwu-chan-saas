const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_stats')
    .setDescription('View premium statistics'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Statistics')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Premium Since', value: 'Jan 15, 2026', inline: true },
        { name: 'Days Remaining', value: '15', inline: true },
        { name: 'Tier', value: 'Premium', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
