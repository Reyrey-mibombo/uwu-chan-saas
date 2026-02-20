const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_tips')
    .setDescription('Get automation tips'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Automation Tips')
      .setDescription('Ways to automate your server:')
      .addFields(
        { name: '1.', value: 'Auto-role for new members', inline: false },
        { name: '2.', value: 'Scheduled announcements', inline: false },
        { name: '3.', value: 'Level-up system', inline: false },
        { name: '4.', value: 'Ticket system automation', inline: false }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
