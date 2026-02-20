const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_insights')
    .setDescription('Get detailed activity insights'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔍 Activity Insights')
      .addFields(
        { name: 'Peak Hours', value: '6PM - 10PM', inline: true },
        { name: 'Most Active', value: 'Friday', inline: true },
        { name: 'Avg. Session', value: '2.5 hours', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
