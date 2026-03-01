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
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const newRank = interaction.options.getString('rank');
      const guildId = interaction.guildId;

      let user = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId });
      if (!user) {
        return interaction.editReply({ embeds: [createErrorEmbed('This user is not registered in the staff database for this server.')] });
      }

      if (!user.staff) user.staff = {};
      const oldRank = user.staff.rank || 'trial';
      user.staff.rank = newRank;
      await user.save();

      const guild = await Guild.findOne({ guildId });
      const newRankRole = guild?.rankRoles?.[newRank];
      const oldRankRole = guild?.rankRoles?.[oldRank];

      let roleStatus = '⚠️ Role configuration unchanged (None found).';
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (member) {
        try {
          if (oldRankRole) await member.roles.remove(oldRankRole, `Demoted by ${interaction.user.tag}`);
          if (newRankRole) await member.roles.add(newRankRole, `Demoted by ${interaction.user.tag}`);
          roleStatus = '✅ Discord roles synchronized properly.';
        } catch (e) {
          roleStatus = '❌ Role sync failed (Check bot permissions/hierarchy).';
        }
      }

      const embed = await createCustomEmbed(interaction, {
        title: '📉 Staff Demotion Executed',
        description: `Successfully adjusted the rank for ${targetUser} within the server hierarchy.`,
        color: 'warning',
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
      const errEmbed = createErrorEmbed('An error occurred while demoting the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
