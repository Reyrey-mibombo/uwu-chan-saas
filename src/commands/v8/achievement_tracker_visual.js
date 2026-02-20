const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker_visual')
    .setDescription('Track achievements visually'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Tracker')
      .addFields(
        { name: 'Gold', value: '[██░░░░░░░] 2/10', inline: true },
        { name: 'Silver', value: '[████░░░░░] 4/10', inline: true },
        { name: 'Bronze', value: '[██████░░░] 6/10', inline: true }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
