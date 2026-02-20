const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_summary')
    .setDescription('View progress summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Progress Summary')
      .addFields(
        { name: 'Level', value: '5', inline: true },
        { name: 'XP', value: '850/1000', inline: true },
        { name: 'Rank', value: 'Senior', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
