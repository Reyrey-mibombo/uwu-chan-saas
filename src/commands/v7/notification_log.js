const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_log')
    .setDescription('View notification history'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Notification Log')
      .setDescription('Recent notifications:')
      .addFields(
        { name: 'Shift reminder', value: '5 min ago', inline: false },
        { name: 'Bonus available', value: '1 hour ago', inline: false },
        { name: 'Task assigned', value: '2 hours ago', inline: false }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
