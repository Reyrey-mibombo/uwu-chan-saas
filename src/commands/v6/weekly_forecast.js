const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_forecast')
    .setDescription('View weekly forecast'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📅 Weekly Forecast')
      .setDescription('Predictions for this week:')
      .addFields(
        { name: 'Expected Activity', value: 'High', inline: true },
        { name: 'Staff Needed', value: '8', inline: true },
        { name: 'Peak Days', value: 'Fri, Sat', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
