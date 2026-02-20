const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_health')
    .setDescription('Check server health metrics'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💚 Server Health')
      .addFields(
        { name: 'Uptime', value: '99.9%', inline: true },
        { name: 'Response Time', value: '45ms', inline: true },
        { name: 'Error Rate', value: '0.1%', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
