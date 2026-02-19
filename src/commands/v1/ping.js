const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  
  async execute(interaction) {
    const ping = interaction.client.ws.ping;
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setDescription(`Bot latency: \`${ping}ms\``)
      .setColor(ping < 100 ? '#2ecc71' : '#e74c3c')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
