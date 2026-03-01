const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_assign')
    .setDescription('Securely propagate algorithmic staff roles tying users back to local databases.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to receive secure role propagation')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Target executable hierarchy role')
        .setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const guildId = interaction.guildId;
      const moderatorId = interaction.user.id;

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply({ embeds: [createErrorEmbed(`Target <@${targetUser.id}> cannot be resolved within this server partition.`)] });
      }

      // Privilege escalation protections
      if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not possess sufficient hierarchical clearance to assign this role parameter.')] });
      }

      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.editReply({ embeds: [createErrorEmbed('My overarching bot role must strictly sit above the target role before I can assign it.')] });
      }

      try {
        await member.roles.add(role);
      } catch (error) {
        return interaction.editReply({ embeds: [createErrorEmbed(`Discord API Execution Error:\n\`${error.message}\``)] });
      }

      // Execute local Guild Scoped Map Update ensuring users are bound securely
      let userAuth = await User.findOne({ userId: targetUser.id, guildId });
      if (!userAuth) {
        userAuth = new User({
          userId: targetUser.id,
          username: targetUser.username,
          guildId: guildId // Crucial Data Bind isolated securely per server!
        });
      }

      await userAuth.save();

      const logTrace = new Activity({
        guildId,
        userId: targetUser.id,
        type: 'command',
        data: {
          command: 'role_assign',
          roleId: role.id,
          roleName: role.name,
          moderatorId
        }
      });

      await logTrace.save();

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Role Propagation Executed',
        description: `Security parameters securely bounded **${role.name}** into user limits.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '👤 Registered Operator', value: `<@${targetUser.id}>`, inline: true },
          { name: '🛡️ Payload Injected', value: `<@&${role.id}>`, inline: true },
          { name: '⚙️ Commanding Author', value: `<@${interaction.user.id}>`, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Role Assign Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred generating propagation permissions.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
