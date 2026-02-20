const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_rewards')
    .setDescription('View elite rewards'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('👑 Elite Rewards')
      .setDescription('**Elite Tier Benefits:**\n• Exclusive badges\n• Priority support\n• Custom role\n• 2x bonus points')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
