const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_visual')
    .setDescription('View performance visuals'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Performance Visual')
      .setDescription('```\nQuality   ▓▓▓▓▓▓▓▓ 80%\nSpeed     ▓▓▓▓▓▓▓▓▓ 90%\nAccuracy  ▓▓▓▓▓▓▓░░ 75%\n```')
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
