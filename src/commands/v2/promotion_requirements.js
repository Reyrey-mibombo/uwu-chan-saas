const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_requirements')
    .setDescription('View promotion requirements'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Promotion Requirements')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Points Required', value: '500', inline: true },
        { name: 'Consistency', value: '80%', inline: true },
        { name: 'Activity', value: '100 hrs', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
