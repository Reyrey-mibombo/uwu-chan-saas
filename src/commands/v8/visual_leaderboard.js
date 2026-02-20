const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_leaderboard')
    .setDescription('View visual leaderboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Visual Leaderboard')
      .setDescription('```\n🥇 User1  ▓▓▓▓▓▓▓▓▓▓ 100%\n🥈 User2  ▓▓▓▓▓▓▓▓▓░ 90%\n🥉 User3  ▓▓▓▓▓▓▓▓░░ 80%\n4.  User4  ▓▓▓▓▓▓▓░░░ 70%\n```')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
