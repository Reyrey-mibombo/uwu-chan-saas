const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anti_spam')
    .setDescription('Configure anti-spam settings'),
  async execute(interaction, client) {
    await interaction.reply('Anti-spam settings configured!');
  }
};
