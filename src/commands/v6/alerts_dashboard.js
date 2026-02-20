const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerts_dashboard')
    .setDescription('View alerts dashboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔔 Alerts Dashboard')
      .setDescription('Active alerts: 3')
      .addFields(
        { name: 'High Priority', value: '1', inline: true },
        { name: 'Medium', value: '1', inline: true },
        { name: 'Low', value: '1', inline: true }
      )
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
