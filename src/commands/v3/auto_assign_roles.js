const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

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
          return interaction.editReply({ embeds: [createErrorEmbed('You cannot configure an automatic assignment for a role position that sits higher or equal to your own.')] });
        }

        if (!guild.settings.autoRoles.includes(role.id)) {
          guild.settings.autoRoles.push(role.id);
        }
        guild.settings.modules.autoRoles = true;
      } else if (enable && !role && guild.settings.autoRoles.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('You must map a target `role` when attempting to boot up an empty assignment array framework.')] });
      } else if (!enable) {
        guild.settings.modules.autoRoles = false;
      }

      await guild.save();

      const embed = await createCustomEmbed(interaction, {
        title: '⚙️ Background Assignment Matrix',
        description: enable
          ? `The \`AutoRole\` parameter has been locally enabled in **${interaction.guild.name}**.`
          : `The \`AutoRole\` parameter architecture has securely shut down.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: []
      });

      if (role && enable) {
        embed.addFields({ name: '🛡️ Validated Vector Payload', value: `Propagation set onto: <@&${role.id}>`, inline: true });
      } else if (enable) {
        const mapping = guild.settings.autoRoles.map(rid => `<@&${rid}>`).join('\n');
        embed.addFields({ name: '🛡️ Active Vectors', value: mapping, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Auto Assign Roles Error:', error);
      const errEmbed = createErrorEmbed('A database configuration error blocked manipulating role-binding algorithms.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
