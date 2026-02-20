const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_forecast')
    .setDescription('View monthly forecast'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📆 Monthly Forecast')
      .setDescription('Predictions for this month:')
      .addFields(
        { name: 'Growth', value: '+12%', inline: true },
        { name: 'Expected Members', value: '500', inline: true },
        { name: 'Revenue', value: '$2,500', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
