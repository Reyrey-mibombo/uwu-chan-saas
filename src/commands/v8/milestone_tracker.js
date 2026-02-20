const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_tracker')
    .setDescription('Track milestones visually'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎯 Milestone Tracker')
      .addFields(
        { name: 'Shifts', value: '[██████░░] 60%', inline: false },
        { name: 'Points', value: '[███████░] 70%', inline: false },
        { name: 'Tasks', value: '[████████] 100%', inline: false }
      )
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
