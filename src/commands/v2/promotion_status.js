const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('Check your promotion status'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Promotion Status')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Current Rank', value: 'Staff Member', inline: true },
        { name: 'Points', value: '150', inline: true },
        { name: 'Required', value: '500', inline: true },
        { name: 'Progress', value: '████████░░ 30%', inline: false }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
