const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_feedback')
    .setDescription('View visual feedback'),
  
  async execute(interaction) {
    await interaction.reply('✨ **Visual Feedback**\nGreat job! Your performance is excellent! 🌟');
  }
};
