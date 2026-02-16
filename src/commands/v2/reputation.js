const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check your reputation score'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ Reputation Score')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Score', value: '750', inline: true },
        { name: 'Rank', value: 'Trusted', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
