const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_notes')
    .setDescription('View moderator notes'),
  async execute(interaction) {
    await interaction.reply({ content: 'No mod notes available.' });
  }
};
