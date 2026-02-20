const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_bonus')
    .setDescription('Claim weekly bonus'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Weekly Bonus')
      .setDescription('You claimed **500 bonus points**!')
      .addFields(
        { name: 'Bonus', value: '+200 pts', inline: true },
        { name: 'Reward', value: 'VIP Badge', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
