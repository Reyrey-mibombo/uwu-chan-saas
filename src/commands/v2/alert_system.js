const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_system')
    .setDescription('Configure alert system'),
  async execute(interaction, client) {
    await interaction.reply('Alert system configured!');
  }
};
