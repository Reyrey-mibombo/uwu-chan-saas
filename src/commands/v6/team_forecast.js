const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_forecast')
    .setDescription('View team performance forecast'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('👥 Team Forecast')
      .setDescription('Predicted team performance:')
      .addFields(
        { name: 'Expected Output', value: '+15%', inline: true },
        { name: 'Coverage', value: '95%', inline: true },
        { name: 'Satisfaction', value: 'High', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
