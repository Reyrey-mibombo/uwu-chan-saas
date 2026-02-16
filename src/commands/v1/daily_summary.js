const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_summary')
    .setDescription('Get daily activity summary'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Daily Summary')
      .setColor(0x3498db)
      .addFields(
        { name: 'Messages', value: '245', inline: true },
        { name: 'Commands', value: '89', inline: true },
        { name: 'New Members', value: '12', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
