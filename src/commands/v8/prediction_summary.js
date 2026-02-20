const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_summary')
    .setDescription('View AI prediction summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔮 Prediction Summary')
      .setDescription('AI-generated insights:\n• Growth: +15% expected\n• Engagement: High\n• Staff needs: 2 more')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
