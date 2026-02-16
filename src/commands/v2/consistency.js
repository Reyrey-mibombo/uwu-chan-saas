const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consistency')
    .setDescription('Check your consistency score'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Consistency Score')
      .setColor(0x3498db)
      .addFields(
        { name: 'Score', value: '85%', inline: true },
        { name: 'Trend', value: '📈 Up', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
