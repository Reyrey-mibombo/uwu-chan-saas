const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_logs')
    .setDescription('View reward history'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Reward Logs')
      .setDescription('Recent rewards:')
      .addFields(
        { name: 'Today', value: '+50 pts (daily bonus)', inline: false },
        { name: 'Yesterday', value: '+100 pts (task complete)', inline: false },
        { name: '2 days ago', value: '+25 pts (streak)', inline: false }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
