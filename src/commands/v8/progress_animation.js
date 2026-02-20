const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_animation')
    .setDescription('View animated progress'),
  
  async execute(interaction) {
    await interaction.reply('📈 **Progress Animation**\n[████████████░░░░░░] 60%');
  }
};
