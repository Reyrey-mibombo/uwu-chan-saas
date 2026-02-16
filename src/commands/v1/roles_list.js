const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles_list')
    .setDescription('List server roles'),
  async execute(interaction) {
    const roles = interaction.guild.roles.cache.map(r => r.name).join(', ');
    await interaction.reply({ content: `**Roles:** ${roles}` });
  }
};
