const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_alerts')
    .setDescription('Configure shift alerts'),
  async execute(interaction, client) {
    await interaction.reply('Shift alerts configured!');
  }
};
