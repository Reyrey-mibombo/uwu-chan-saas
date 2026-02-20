const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_chart')
    .setDescription('View progress chart'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Progress Chart')
      .setDescription('```\nLevel 1  ▓▓▓▓▓▓▓▓▓\nLevel 2  ▓▓▓▓▓▓░░░\nLevel 3  ▓▓▓▓░░░░░\nLevel 4  ▓▓▓░░░░░░\n```')
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
