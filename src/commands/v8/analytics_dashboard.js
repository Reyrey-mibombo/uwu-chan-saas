const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('View full analytics dashboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Analytics Dashboard')
      .addFields(
        { name: 'Members', value: '1,234', inline: true },
        { name: 'Messages', value: '45,678', inline: true },
        { name: 'Commands', value: '12,345', inline: true },
        { name: 'Active', value: '89%', inline: true },
        { name: 'Growth', value: '+%', inline: true },
        { name: 'Revenue', value: '$152,500', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
