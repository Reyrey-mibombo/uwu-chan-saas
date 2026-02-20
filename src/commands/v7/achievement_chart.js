const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_chart')
    .setDescription('View achievement chart'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Chart')
      .setDescription('Your achievements:')
      .addFields(
        { name: '🥇 Gold', value: '3', inline: true },
        { name: '🥈 Silver', value: '8', inline: true },
        { name: '🥉 Bronze', value: '15', inline: true }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
