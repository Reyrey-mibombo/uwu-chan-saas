const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_reports')
    .setDescription('View detailed performance reports')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Performance Reports')
      .addFields(
        { name: 'Tasks Completed', value: '45', inline: true },
        { name: 'Avg. Response Time', value: '2.3m', inline: true },
        { name: 'Quality Score', value: '92%', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
