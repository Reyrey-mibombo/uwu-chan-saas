const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_permissions')
    .setDescription('Check your permissions'),
  async execute(interaction) {
    const perms = interaction.member.permissions.toArray().join(', ');
    await interaction.reply({ content: `Your permissions: ${perms}` });
  }
};
