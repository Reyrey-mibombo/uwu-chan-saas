const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Set your timezone'),
  async execute(interaction) {
    await interaction.reply({ content: 'Your timezone has been set to UTC' });
  }
};
