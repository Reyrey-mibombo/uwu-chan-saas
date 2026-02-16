const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_score')
    .setDescription('View performance analytics'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Performance Score')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Score', value: '92/100', inline: true },
        { name: 'Grade', value: 'A', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
