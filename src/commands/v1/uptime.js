const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Check bot uptime'),
  async execute(interaction, client) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const embed = new EmbedBuilder()
      .setTitle('⏱️ Bot Uptime')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Uptime', value: `${hours}h ${minutes}m`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
