const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view_rank_roles')
    .setDescription('[Free] View all configured rank roles for promotions'),

  async execute(interaction, client) {
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
        value: role ? `**${role.name}**` : '❌ Not set',
        inline: true
      };
    });

    const embed = createCoolEmbed()
      .setTitle('📊 Rank Roles Configuration')
      
      .setDescription('These roles will be automatically assigned when users are promoted.')
      .addFields(...roleList)
      .addFields(
        { name: '💡 Tip', value: 'Use `/set_rank_roles` to change which role each rank gives.', inline: false }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



