const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('View elite member badges'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ Elite Badges')
      .setDescription('🏆 Champion Badge\n🌟 Star Badge\n💎 Diamond Badge\n🔥 Fire Badge')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
