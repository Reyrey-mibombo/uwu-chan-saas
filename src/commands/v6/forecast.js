const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forecast')
    .setDescription('View activity forecast'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔮 Activity Forecast')
      .setDescription('Predicted activity for next 7 days:')
      .addFields(
        { name: 'Mon', value: 'High', inline: true },
        { name: 'Tue', value: 'High', inline: true },
        { name: 'Wed', value: 'Medium', inline: true },
        { name: 'Thu', value: 'High', inline: true },
        { name: 'Fri', value: 'Very High', inline: true }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
