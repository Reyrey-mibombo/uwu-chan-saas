const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_notify')
    .setDescription('View progress notifications'),
  
  async execute(interaction) {
    await interaction.reply('📢 **Progress Update**\n🎉 You\'re now 75% to your weekly goal!\nKeep it up!');
  }
};
