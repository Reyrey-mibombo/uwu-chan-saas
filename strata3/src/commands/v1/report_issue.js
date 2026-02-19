const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_issue')
    .setDescription('Report an issue'),
  async execute(interaction) {
    await interaction.reply({ content: 'Issue reported. Thank you!' });
  }
};
