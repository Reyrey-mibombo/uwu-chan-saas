const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_forecast')
    .setDescription('View growth forecast'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Growth Forecast')
      .setDescription('Projected growth:\n• Next month: +15%\n• 3 months: +45%\n• 6 months: +100%')
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
