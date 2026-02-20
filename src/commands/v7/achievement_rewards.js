const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_rewards')
    .setDescription('View achievement rewards'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Rewards')
      .setDescription('Available achievements:')
      .addFields(
        { name: 'First Shift', value: '50 pts', inline: true },
        { name: 'Week Streak', value: '100 pts', inline: true },
        { name: 'Top Staff', value: '500 pts', inline: true }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
