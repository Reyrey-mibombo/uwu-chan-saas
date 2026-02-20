const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_tracker')
    .setDescription('Track bonuses visually'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Tracker')
      .addFields(
        { name: 'Daily', value: '[████████] 100%', inline: true },
        { name: 'Weekly', value: '[██████░░] 75%', inline: true },
        { name: 'Season', value: '[██░░░░░░] 25%', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
