const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_animation')
    .setDescription('View animated rank progression'),
  
  async execute(interaction) {
    await interaction.reply('⬆️ **Rank Animation**\n▓▓▓▓▓▓▓▓░░░░ 80% to next rank');
  }
};
