const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_report')
    .setDescription('View weekly staff report'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Weekly Report')
      .setDescription('This week\'s activity summary:')
      .addFields(
        { name: 'Total Shifts', value: '45', inline: true },
        { name: 'Active Staff', value: '12', inline: true },
        { name: 'Avg. Hours', value: '4.2h', inline: true }
      )
      .setColor('#3498db')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
