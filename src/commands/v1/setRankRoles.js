const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_rank_roles')
    .setDescription('[Free] Set custom roles for each promotion rank')
    .addStringOption(opt => opt.setName('rank').setDescription('Which rank').setRequired(true)
      .addChoices(
        { name: 'Trial → Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' }
      ))
    .addRoleOption(opt => opt.setName('role').setDescription('The Discord role for this rank').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ embeds: [createErrorEmbed('You need Manage Roles permission!')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guildId;
      const rank = interaction.options.getString('rank');
      const role = interaction.options.getRole('role');

      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name });
      }

      if (!guildData.rankRoles) {
        guildData.rankRoles = {};
      }

      guildData.rankRoles[rank] = role.id;
      await guildData.save();

      const rankNames = {
        staff: 'Staff',
        senior: 'Senior',
        manager: 'Manager',
        admin: 'Admin'
      };

      const embed = await createCustomEmbed(interaction, {
        title: '⚙️ Rank-Role Binding Updated',
        description: `Successfully configured auto-role assignment for the **${rankNames[rank]}** tier.`,
        color: 'success',
        fields: [
          { name: '📌 Target Rank', value: `\`${rankNames[rank]}\``, inline: true },
          { name: '🎭 Assigned Role', value: `<@&${role.id}>`, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while setting rank roles.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
