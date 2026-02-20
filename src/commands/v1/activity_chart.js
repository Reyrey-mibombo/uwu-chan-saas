const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View activity chart'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Activity Chart')
      .setDescription('Activity chart placeholder\n```\nMon: ████████░░ 80%\nTue: ██████████ 100%\nWed: ██████░░░░ 60%\nThu: ███████░░░ 70%\nFri: ████░░░░░░ 40%\n```')
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
