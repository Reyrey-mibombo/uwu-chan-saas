const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('View elite badges and achievements'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Elite Badges')
      .setColor(0xffd700)
      .addFields(
        { name: 'Bronze', value: '✅', inline: true },
        { name: 'Silver', value: '✅', inline: true },
        { name: 'Gold', value: '❌', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
