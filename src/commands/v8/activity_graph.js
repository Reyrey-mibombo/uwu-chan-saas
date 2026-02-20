const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_graph')
    .setDescription('View activity graph'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Graph')
      .setDescription('```\nMon  ▓▓▓▓▓▓░░░░\nTue  ▓▓▓▓▓▓▓░░\nWed  ▓▓▓▓▓▓▓▓░\nThu  ▓▓▓▓▓▓▓▓▓\nFri  ▓▓▓▓▓▓▓▓▓\n```')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
