const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency, uptime, and response time'),

  async execute(interaction) {
    try {
      const sent = await interaction.deferReply({ fetchReply: true });
      const ping = interaction.client.ws.ping;
      const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
      const days = Math.floor(interaction.client.uptime / 86400000);
      const hours = Math.floor(interaction.client.uptime / 3600000) % 24;
      const minutes = Math.floor(interaction.client.uptime / 60000) % 60;
      const seconds = Math.floor(interaction.client.uptime / 1000) % 60;

      const embed = createCoolEmbed()
        .setTitle('🏓 Pong!')
        .setDescription('Here are the current bot statistics:')
        .addFields(
          { name: '📡 Websocket Latency', value: `\`${ping}ms\``, inline: true },
          { name: '🔄 Roundtrip Latency', value: `\`${roundtrip}ms\``, inline: true },
          { name: '⏱️ Uptime', value: `\`${days}d ${hours}h ${minutes}m ${seconds}s\``, inline: false }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while fetching ping.')] });
      } else {
        await interaction.reply({ embeds: [createErrorEmbed('An error occurred while fetching ping.')], ephemeral: true });
      }
    }
  }
};
