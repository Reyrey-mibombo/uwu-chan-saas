const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_bonus')
    .setDescription('Claim daily bonus'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎁 Daily Bonus')
      .setDescription('You claimed **50 bonus points**!')
      .addFields(
        { name: 'Streak', value: '5 days', inline: true },
        { name: 'Multiplier', value: '1.5x', inline: true }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
