const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  
  async execute(interaction) {
    const ping = interaction.client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🏓 Pong!')
      .setDescription(`Bot latency: \`${ping}ms\``)
      
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};
