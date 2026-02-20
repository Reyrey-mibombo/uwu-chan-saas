const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_summary')
    .setDescription('View animated activity summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Summary')
      .addFields(
        { name: 'Messages Today', value: '1,234', inline: true },
        { name: 'Active Users', value: '567', inline: true },
        { name: 'Commands Used', value: '890', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
