const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Manually demote a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to demote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to demote to').setRequired(true)
      .addChoices(
        { name: 'Trial', value: 'trial' },
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' }
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ embeds: [createErrorEmbed('You need Manage Roles permission!')], ephemeral: true });
      }

      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const newRank = interaction.options.getString('rank');
      const guildId = interaction.guildId;

      let user = await User.findOne({ userId: targetUser.id });
      if (!user) {
        user = new User({ userId: targetUser.id, username: targetUser.tag });
      }

      if (!user.staff) user.staff = {};
      const oldRank = user.staff.rank || 'trial';
      user.staff.rank = newRank;
      await user.save();

      const guild = await Guild.findOne({ guildId });
      const newRankRole = guild?.rankRoles?.[newRank];
      const oldRankRole = guild?.rankRoles?.[oldRank];

      let roleStatus = 'Role configuration unchanged.';
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (member) {
        try {
          if (oldRankRole) await member.roles.remove(oldRankRole);
          if (newRankRole) await member.roles.add(newRankRole);
          roleStatus = `Updated discord roles successfully.`;
        } catch (e) {
          roleStatus = `Failed to update discord roles (Bot might lack permissions or hierarchy is too low).`;
        }
      }

      const embed = createSuccessEmbed('User Demoted', `Successfully demoted ${targetUser} to **${newRank.toUpperCase()}**.\n\n` +
        `**Previous Rank:** \`${oldRank.toUpperCase()}\`\n` +
        `**New Rank:** \`${newRank.toUpperCase()}\`\n` +
        `**Role Status:** ${roleStatus}`);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while demoting the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
