const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_rewards')
    .setDescription('View event rewards'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎊 Event Rewards')
      .setDescription('Current events:')
      .addFields(
        { name: 'Valentine Event', value: '200 pts + Rose Badge', inline: false },
        { name: 'Weekly Contest', value: '500 pts', inline: false }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
