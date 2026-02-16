const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_report')
    .setDescription('View weekly activity report'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Weekly Report')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Total Messages', value: '1,523', inline: true },
        { name: 'Commands Used', value: '456', inline: true },
        { name: 'Active Staff', value: '12', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
