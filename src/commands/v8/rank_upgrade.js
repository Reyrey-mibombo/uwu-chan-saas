const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_upgrade')
    .setDescription('View rank upgrade effects'),
  
  async execute(interaction) {
    await interaction.reply('⬆️ **RANK UPGRADE!**\nYou are now **Senior Staff**!\nNew permissions unlocked! 🎉');
  }
};
