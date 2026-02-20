const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_visual')
    .setDescription('View visual leaderboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Visual Leaderboard')
      .setDescription('🥇 **User1** - 2000 pts\n🥈 **User2** - 1850 pts\n🥉 **User3** - 1700 pts\n4. User4 - 1550 pts\n5. User5 - 1400 pts')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
