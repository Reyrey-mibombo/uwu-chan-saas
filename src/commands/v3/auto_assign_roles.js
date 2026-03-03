const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_assign_roles')
    .setDescription('Configure auto-role assignment vectors dynamically for onboarded profiles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Toggle the onboarding engine parameter module')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Target Server Role to auto-propagate upon execution')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const enable = interaction.options.getBoolean('enable');
      const role = interaction.options.getRole('role');
      const guildId = interaction.guildId;

      // Sandboxed querying
      let guild = await Guild.findOne({ guildId });
      if (!guild) {
        guild = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guild.settings) guild.settings = {};
      if (!guild.settings.autoRoles) guild.settings.autoRoles = [];
      if (!guild.settings.modules) guild.settings.modules = {};

      if (enable && role) {
        // Prevent highest-role abuse recursively
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_auto_assign_roles').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You cannot configure an automatic assignment for a role position that sits higher or equal to your own.')], components: [row] });
        }

        if (!guild.settings.autoRoles.includes(role.id)) {
          guild.settings.autoRoles.push(role.id);
        }
        guild.settings.modules.autoRoles = true;
      } else if (enable && !role && guild.settings.autoRoles.length === 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_auto_assign_roles').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You must map a target `role` when attempting to boot up an empty assignment array framework.')], components: [row] });
      } else if (!enable) {
        guild.settings.modules.autoRoles = false;
      }

      await guild.save();

      const embed = await createCustomEmbed(interaction, {
        title: '?? Background Assignment Matrix',
        description: enable
          ? `The \`AutoRole\` parameter has been locally enabled in **${interaction.guild.name}**.`
          : `The \`AutoRole\` parameter architecture has securely shut down.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: []
      });

      if (role && enable) {
        embed.addFields({ name: '??? Validated Vector Payload', value: `Propagation set onto: <@&${role.id}>`, inline: true });
      } else if (enable) {
        const mapping = guild.settings.autoRoles.map(rid => `<@&${rid}>`).join('\n');
        embed.addFields({ name: '??? Active Vectors', value: mapping, inline: true });
      }

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_auto_assign_roles').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Auto Assign Roles Error:', error);
      const errEmbed = createErrorEmbed('A database configuration error blocked manipulating role-binding algorithms.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_auto_assign_roles').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


