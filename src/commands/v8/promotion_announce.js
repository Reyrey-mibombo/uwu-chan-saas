const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Guild, Activity } = require('../../database/mongo');

const RANK_EMOJIS = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_announce')
    .setDescription('🎊 Manually promote a staff member — updates DB, assigns role, DMs user, posts announcement')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to promote').setRequired(true))
    .addStringOption(opt =>
      opt.setName('new_rank').setDescription('Rank to promote to').setRequired(true).addChoices(
        { name: '🔰 Trial', value: 'trial' },
        { name: '⭐ Staff', value: 'staff' },
        { name: '🌟 Senior', value: 'senior' },
        { name: '💎 Manager', value: 'manager' },
        { name: '👑 Admin', value: 'admin' }
      )
    )
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for promotion').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.editReply({ embeds: [createErrorEmbed('You need the `Manage Roles` permission to promote staff.')] });
      }

      const target = interaction.options.getUser('user');
      const newRank = interaction.options.getString('new_rank');
      const reason = interaction.options.getString('reason') || 'Exceptional performance';
      const guildId = interaction.guildId;

      // Fetch current rank before update
      const currentUser = await User.findOne({ userId: target.id }).lean();
      const oldRank = currentUser?.staff?.rank || 'member';
      const currentPts = currentUser?.staff?.points || 0;
      const currentShifts = currentUser?.staff?.shifts || 0;

      // Update DB
      await User.findOneAndUpdate(
        { userId: target.id },
        {
          $set: {
            'staff.rank': newRank,
            'staff.lastPromotionDate': new Date(),
            username: target.username
          }
        },
        { upsert: true }
      );

      // Log to Activity
      await Activity.create({
        guildId,
        userId: target.id,
        type: 'promotion',
        data: { newRank, oldRank, promotedBy: interaction.user.id, reason }
      });

      // Role assignment from guild config
      const guildData = await Guild.findOne({ guildId }).lean();
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      let roleStatus = '`⚪ No role config`';

      if (member && guildData?.rankRoles) {
        const newRoleId = guildData.rankRoles[newRank];
        const oldRoleId = guildData.rankRoles[oldRank];
        try {
          if (oldRoleId) await member.roles.remove(oldRoleId, `Promoted from ${oldRank}`);
          if (newRoleId) await member.roles.add(newRoleId, `Promoted to ${newRank}`);
          roleStatus = newRoleId ? `\`✅ Role assigned\`` : `\`⚠️ No role for ${newRank}\``;
        } catch {
          roleStatus = `\`❌ Role error — check bot permissions\``;
        }
      }

      // DM the promoted user
      let dmStatus = '✅ DM Sent';
      try {
        const dmEmbed = createCustomEmbed(interaction, {
          title: `🎉 You've been promoted!`,
          description: `Congratulations! You have been promoted to **${RANK_EMOJIS[newRank] || ''} ${newRank.toUpperCase()}** in **${interaction.guild.name}**!\n\n**Reason:** ${reason}\n\nKeep up the amazing work! 🚀`,
          color: '#f1c40f',
          thumbnail: interaction.guild.iconURL({ dynamic: true })
        });
        await target.send({ embeds: [await dmEmbed] });
      } catch { dmStatus = '❌ DMs closed'; }

      // Public announcement embed
      const announceEmbed = await createCustomEmbed(interaction, {
        title: `🎊 ★ PROMOTION ANNOUNCEMENT ★ 🎊`,
        thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
        description: `✨ **Congratulations** <@${target.id}>! ✨\n\nYou have been promoted to **${RANK_EMOJIS[newRank] || '⭐'} ${newRank.toUpperCase()}**!\n\nKeep up the amazing work! 🚀`,
        fields: [
          { name: '👤 Promoted', value: `<@${target.id}>`, inline: true },
          { name: '📈 Old Rank', value: `\`${oldRank.toUpperCase()}\``, inline: true },
          { name: '🎖️ New Rank', value: `${RANK_EMOJIS[newRank] || ''} \`${newRank.toUpperCase()}\``, inline: true },
          { name: '👮 Promoted By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📝 Reason', value: reason, inline: true },
          { name: '🎭 Role', value: roleStatus, inline: true },
          { name: '⭐ Career Stats', value: `\`${currentPts.toLocaleString()} pts\` | \`${currentShifts}\` shifts`, inline: false },
          { name: '📬 DM', value: `\`${dmStatus}\``, inline: true }
        ],
        color: '#f1c40f',
        footer: 'uwu-chan • Promotion System'
      });

      // Also send to promotion channel if configured
      if (guildData?.settings?.promotionChannel) {
        const promoCh = interaction.guild.channels.cache.get(guildData.settings.promotionChannel);
        if (promoCh) {
          promoCh.send({
            content: `🎊 **HUGE CONGRATULATIONS TO <@${target.id}>!** 🎊`,
            embeds: [announceEmbed]
          }).catch(() => { });
        }
      }

      await interaction.editReply({ embeds: [announceEmbed] });
    } catch (error) {
      console.error('[promotion_announce] Error:', error);
      const errEmbed = createErrorEmbed('Failed to process promotion. Check bot permissions.');
      if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errEmbed] });
      else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};
