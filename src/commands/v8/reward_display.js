const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_display')
    .setDescription('Display rewards with effects'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎁 Reward Display')
      .setDescription('✨ **You earned:**\n• 100 Bonus Points\n• ⭐ Star Badge\n• 🔓 New Features Unlocked')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
