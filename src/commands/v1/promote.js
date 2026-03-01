const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Manually promote a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to promote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to promote to').setRequired(true)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' },
        { name: 'Owner', value: 'owner' }
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
      const rankRole = guild?.rankRoles?.[newRank];

      let roleStatus = 'No rank role configured.';
      if (rankRole) {
        const member = interaction.guild.members.cache.get(targetUser.id);
        if (member) {
          try {
            await member.roles.add(rankRole);
            roleStatus = `<@&${rankRole}> added successfully.`;
          } catch (e) {
            roleStatus = 'Failed to add role (Bot might lack permissions or hierarchy is too low).';
          }
        }
      }

      const embed = createSuccessEmbed('User Promoted', `Successfully promoted ${targetUser} to **${newRank.toUpperCase()}**.\n\n` +
        `**Previous Rank:** \`${oldRank.toUpperCase()}\`\n` +
        `**New Rank:** \`${newRank.toUpperCase()}\`\n` +
        `**Role Status:** ${roleStatus}`);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while promoting the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
