const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles_list')
    .setDescription('List server roles'),

  async execute(interaction) {
    const guild = interaction.guild;
    const roles = guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => `${r} (${r.members.size})`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🎭 Server Roles')
      .setColor(0x9b59b6)
      .setDescription(roles || 'No roles found')
      .setFooter({ text: `Total: ${guild.roles.cache.size - 1} roles` });

    await interaction.reply({ embeds: [embed] });
  }
};
