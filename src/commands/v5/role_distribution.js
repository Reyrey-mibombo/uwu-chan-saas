const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_distribution')
    .setDescription('View role distribution'),

  async execute(interaction) {
    const guild = interaction.guild;

    const users = await User.find({ 'guilds.guildId': guild.id }).lean();

    const roleCounts = {};
    users.forEach(u => {
      const guildData = u.guilds?.find(g => g.guildId === guild.id);
      if (guildData?.roles) {
        guildData.roles.forEach(roleId => {
          roleCounts[roleId] = (roleCounts[roleId] || 0) + 1;
        });
      }
    });

    const sortedRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const roleDescriptions = await Promise.all(sortedRoles.map(async ([roleId]) => {
      const role = guild.roles.cache.get(roleId);
      return { id: roleId, name: role?.name || 'Unknown', count: roleCounts[roleId] };
    }));

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🎭 Role Distribution')
      
      .setDescription(
        roleDescriptions.map(r => `${r.name}: ${r.count}`).join('\n') || 'No role data found'
      )
      .addFields(
        { name: 'Total Tracked Users', value: users.length.toString(), inline: true },
        { name: 'Unique Roles', value: sortedRoles.length.toString(), inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
