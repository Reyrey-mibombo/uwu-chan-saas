const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_patterns')
    .setDescription('View activity patterns'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Patterns')
      .setDescription('Peak activity times:\n• Weekdays: 6PM - 10PM\n• Weekends: 12PM - 11PM')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
