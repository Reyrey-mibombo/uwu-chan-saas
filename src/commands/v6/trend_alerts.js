const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_alerts')
    .setDescription('View trend alerts'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔔 Trend Alerts')
      .setDescription('Active alerts:')
      .addFields(
        { name: '⚠️', value: 'Activity drop detected (-15%)', inline: false },
        { name: '📈', value: 'New member spike', inline: false }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
