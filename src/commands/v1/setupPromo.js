const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup_promo')
    .setDescription('[Free] Quick setup for promotion system')
    .addChannelOption(opt => opt.setName('channel').setDescription('Promotion announcements channel').setRequired(true))
    .addRoleOption(opt => opt.setName('staff_role').setDescription('Role for Staff rank').setRequired(true))
    .addRoleOption(opt => opt.setName('senior_role').setDescription('Role for Senior rank (optional)').setRequired(false))
    .addRoleOption(opt => opt.setName('manager_role').setDescription('Role for Manager rank (optional)').setRequired(false))
    .addRoleOption(opt => opt.setName('admin_role').setDescription('Role for Admin rank (optional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ embeds: [createErrorEmbed('You need Manage Server permission!')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guildId;
      const channel = interaction.options.getChannel('channel');
      const staffRole = interaction.options.getRole('staff_role');
      const seniorRole = interaction.options.getRole('senior_role');
      const managerRole = interaction.options.getRole('manager_role');
      const adminRole = interaction.options.getRole('admin_role');

      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name });
      }

      guildData.rankRoles = {
        staff: staffRole.id,
        senior: seniorRole?.id || null,
        manager: managerRole?.id || null,
        admin: adminRole?.id || null
      };

      guildData.settings = guildData.settings || {};
      guildData.settings.promotionChannel = channel.id;

      guildData.promotionRequirements = {
        staff: { points: 100, shifts: 5, consistency: 70 },
        senior: { points: 300, shifts: 10, consistency: 75 },
        manager: { points: 600, shifts: 20, consistency: 80 },
        admin: { points: 1000, shifts: 30, consistency: 85 }
      };

      guildData.settings.modules = guildData.settings.modules || {};
      guildData.settings.modules.automation = true;

      await guildData.save();

      const rolesList = [
        `⭐ Staff: <@&${staffRole.id}>`,
        seniorRole ? `🌟 Senior: <@&${seniorRole.id}>` : null,
        managerRole ? `💎 Manager: <@&${managerRole.id}>` : null,
        adminRole ? `👑 Admin: <@&${adminRole.id}>` : null
      ].filter(Boolean).join('\n');

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Promotion Architecture Deployed',
        description: 'Your server\'s promotion system and rank hierarchy have been successfully initialized.',
        fields: [
          { name: '📢 Notification Vector', value: `<#${channel.id}>`, inline: true },
          { name: '🎭 Rank Assignment Matrix', value: rolesList, inline: false },
          { name: '📊 Threshold Configuration', value: '```Staff: 100pts\nSenior: 300pts\nManager: 600pts\nAdmin: 1000pts```', inline: false }
        ],
        color: 'success'
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred during promotion setup.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
