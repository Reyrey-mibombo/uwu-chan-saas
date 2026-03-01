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
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const newRank = interaction.options.getString('rank');
      const guildId = interaction.guildId;

      const staffSystem = interaction.client.systems.staff;
      await staffSystem.getOrCreateUser(targetUser.id, guildId, targetUser.username);

      let user = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId });

      if (!user.staff) user.staff = {};
      const oldRank = user.staff.rank || 'trial';
      user.staff.rank = newRank;
      user.staff.lastPromotionDate = new Date();
      await user.save();

      const guild = await Guild.findOne({ guildId });
      const rankRole = guild?.rankRoles?.[newRank];

      let roleStatus = '⚠️ No rank role configured in settings.';
      if (rankRole) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          try {
            await member.roles.add(rankRole, `Promoted by ${interaction.user.tag}`);
            roleStatus = '✅ Rank role assigned successfully.';
          } catch (e) {
            roleStatus = '❌ Failed to assign role (Permission/Hierarchy issue).';
          }
        }
      }

      const embed = await createCustomEmbed(interaction, {
        title: '📈 Staff Promotion Executed',
        description: `Successfully promoted ${targetUser} within the hierarchical structure.`,
        color: 'success',
        fields: [
          { name: '👤 Target', value: `${targetUser.tag}`, inline: true },
          { name: '🎖️ New Rank', value: `\`${newRank.toUpperCase()}\``, inline: true },
          { name: '🔄 Progression', value: `\`${oldRank.toUpperCase()}\` ➔ \`${newRank.toUpperCase()}\``, inline: false },
          { name: '📡 Discord Sync', value: roleStatus, inline: false }
        ]
      });

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
