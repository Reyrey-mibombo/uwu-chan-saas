const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  
  async execute(interaction) {
    const ping = interaction.client.ws.ping;
    const embed = createCoolEmbed()
      .setTitle('🏓 Pong!')
      .setDescription(`Bot latency: \`${ping}ms\``)
      
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



