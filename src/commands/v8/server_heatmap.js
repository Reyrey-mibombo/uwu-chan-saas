const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_heatmap')
    .setDescription('View server activity heatmap'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔥 Server Heatmap')
      .setDescription('```\nMon  ▓▓▓█░░░░░\nTue  ▓▓▓▓░░░░░\nWed  ▓▓▓▓▓░░░░\nThu  ▓▓▓▓▓█░░░\nFri  ▓▓▓▓▓▓█░░\n```\nHotter = More Activity')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
