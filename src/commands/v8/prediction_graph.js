const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_graph')
    .setDescription('View prediction graph'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔮 Prediction Graph')
      .setDescription('```\nWeek 1  ░░░▓▓▓▓▓▓\nWeek 2  ░░▓▓▓▓▓▓▓\nWeek 3  ░▓▓▓▓▓▓▓▓\nWeek 4  ▓▓▓▓▓▓▓▓▓\n```\nPredicted Growth')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
