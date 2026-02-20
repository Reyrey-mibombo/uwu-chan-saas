const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_rankings')
    .setDescription('View visual rankings'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Visual Rankings')
      .setDescription('```\n🥇 User1  ██████████ 5000\n🥈 User2  █████████░ 4500\n🥉 User3  ████████░░ 4000\n4.  User4  ███████░░░ 3500\n5.  User5  ██████░░░░ 3000\n```')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
