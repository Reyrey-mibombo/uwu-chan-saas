const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_summary')
    .setDescription('View milestone progress'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎯 Milestone Summary')
      .setDescription('Current milestones:')
      .addFields(
        { name: '100 Shifts', value: '85/100', inline: true },
        { name: '1000 Points', value: '750/1000', inline: true },
        { name: '50 Tasks', value: 'Complete! ✅', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
