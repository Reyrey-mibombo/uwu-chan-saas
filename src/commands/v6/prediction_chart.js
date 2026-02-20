const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_chart')
    .setDescription('View prediction charts'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Prediction Chart')
      .setDescription('AI-generated predictions:\n```\nWeek 1: ████████░░\nWeek 2: ██████████\nWeek 3: ██████████\nWeek 4: ██████░░░░\n```')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
