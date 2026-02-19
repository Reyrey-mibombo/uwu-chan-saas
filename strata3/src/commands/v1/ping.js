const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  async execute(interaction, client) {
    const ping = interaction.client.ws.ping;
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Latency', value: `${ping}ms`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
