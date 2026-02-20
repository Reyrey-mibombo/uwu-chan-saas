const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_dashboard')
    .setDescription('View interactive dashboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Interactive Dashboard')
      .setDescription('**Quick Stats:**\n• Members: 1,234\n• Messages: 45K\n• Revenue: $150K\n\nUse buttons for more details!')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
