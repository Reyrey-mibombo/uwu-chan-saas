const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_display')
    .setDescription('Display rank with effects'),
  
  async execute(interaction) {
    await interaction.reply('⬆️ **Your Rank**\n\n🌟 **Senior Staff** 🌟\nLevel 5 • 850/1000 XP');
  }
};
