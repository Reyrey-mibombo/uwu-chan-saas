const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_display')
    .setDescription('Display achievements with effects'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Display')
      .setDescription('🌟 **Your Achievements** 🌟\n\n🎖️ First Shift\n🎖️ Week Warrior\n🎖️ Top Performer\n🎖️ Community Hero')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
