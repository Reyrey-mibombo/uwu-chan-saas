const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rank_up')
    .setDescription('Configure automatic rank upgrades'),
  async execute(interaction, client) {
    await interaction.reply('Auto rank-up configured!');
  }
};
