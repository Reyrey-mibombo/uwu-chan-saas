const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_effects')
    .setDescription('View premium effects'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Effects')
      .setDescription('✨ **Premium Perks** ✨\n• Animated profile border\n• Exclusive badges\n• Priority support\n• 2x bonus points')
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
