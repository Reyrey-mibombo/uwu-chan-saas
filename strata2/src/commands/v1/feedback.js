const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback about the bot'),
  async execute(interaction) {
    await interaction.reply({ content: 'Thank you for your feedback!' });
  }
};
