const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite_link')
    .setDescription('Get bot invite link'),
  async execute(interaction) {
    await interaction.reply({ content: 'Invite Uwu-chan: https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID' });
  }
};
