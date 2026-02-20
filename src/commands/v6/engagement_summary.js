const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_summary')
    .setDescription('View engagement summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Engagement Summary')
      .addFields(
        { name: 'Total Engagement', value: '15,432', inline: true },
        { name: 'Active Users', value: '1,234', inline: true },
        { name: 'Avg. Per Day', value: '514', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
