const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_chart')
    .setDescription('View engagement chart'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Engagement Chart')
      .setDescription('```\nWeek 1  ▓▓▓▓░░░░░\nWeek 2  ▓▓▓▓▓░░░░\nWeek 3  ▓▓▓▓▓▓░░░\nWeek 4  ▓▓▓▓▓▓▓░░\n```')
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
