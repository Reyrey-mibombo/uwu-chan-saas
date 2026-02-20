const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_effects')
    .setDescription('View milestone celebration effects'),
  
  async execute(interaction) {
    await interaction.reply('🎆 **Milestone Reached!**\n🌟 100 SHIFTS COMPLETE! 🌟\n🎆');
  }
};
