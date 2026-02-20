const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_visuals')
    .setDescription('View event visuals'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎊 Event Visuals')
      .setDescription('**Current Event:** Valentine\'s Day\n\n🎁 Rewards: 500 pts + Heart Badge\n⏰ Time Left: 3 days')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
