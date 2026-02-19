const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_rules')
    .setDescription('View server rules'),
  async execute(interaction) {
    await interaction.reply({ content: 'Server rules:\n1. Be respectful\n2. No spam\n3. Follow Discord ToS' });
  }
};
