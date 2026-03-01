const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view_rank_roles')
    .setDescription('[Free] View all configured rank roles for promotions'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const guildId = interaction.guildId;
      const guildData = await Guild.findOne({ guildId });

      const rankRoles = guildData?.rankRoles || {};

      const ranks = [
        { key: 'staff', name: 'Staff', emoji: '⭐' },
        { key: 'senior', name: 'Senior', emoji: '🌟' },
        { key: 'manager', name: 'Manager', emoji: '💎' },
        { key: 'admin', name: 'Admin', emoji: '👑' }
      ];

      const roleList = ranks.map(r => {
        const roleId = rankRoles[r.key];
        const role = roleId ? interaction.guild.roles.cache.get(roleId) : null;
        return {
          name: `${r.emoji} ${r.name}`,
          value: role ? `**${role.name}** (<@&${role.id}>)` : '❌ Not set',
          inline: true
        };
      });

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Rank Roles Index',
        description: 'Automated role assignments configured for server promotion tiers.',
        fields: [
          ...roleList,
          { name: '💡 Configuration', value: 'Modify these bindings using `/set_rank_roles`.', inline: false }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching rank roles.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
