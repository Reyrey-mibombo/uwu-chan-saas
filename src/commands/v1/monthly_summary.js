const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_summary')
    .setDescription('View monthly activity summary'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Monthly Summary')
      .setColor(0x3498db)
      .addFields(
        { name: 'Messages', value: '6,543', inline: true },
        { name: 'Commands', value: '2,109', inline: true },
        { name: 'New Members', value: '156', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
