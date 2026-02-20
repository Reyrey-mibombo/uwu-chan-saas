const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_summary')
    .setDescription('View daily activity summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Daily Summary')
      .setDescription('Today\'s activity:')
      .addFields(
        { name: 'Messages', value: '1,234', inline: true },
        { name: 'Members Joined', value: '15', inline: true },
        { name: 'Commands Used', value: '89', inline: true }
      )
      .setColor('#9b59b6')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
