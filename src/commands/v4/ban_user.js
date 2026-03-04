const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban_user')
    .setDescription('⛔ Ban a member from this server with reason, DM, and audit log')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(opt =>
      opt.setName('delete_days')
        .setDescription('Delete this many days of messages (0-7)')
        .setMinValue(0).setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.editReply({ embeds: [createErrorEmbed('You lack the `Ban Members` permission.')] });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        try {
          await interaction.guild.bans.create(target.id, { reason: `${reason} | By: ${interaction.user.tag}`, deleteMessageDays: deleteDays });
        } catch (e) {
          return await interaction.editReply({ embeds: [createErrorEmbed(`Could not ban **${target.username}**. They may not be in the server or I lack permissions.`)] });
        }
      } else {
        if (!member.bannable) {
          return await interaction.editReply({ embeds: [createErrorEmbed(`I cannot ban **${target.username}**. Their role is higher than mine.`)] });
        }

        let dmStatus = '✅ DM Sent';
        try {
          const dmEmbed = createErrorEmbed(`You have been **banned** from **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`);
          dmEmbed.setTitle('⛔ You were banned');
          await target.send({ embeds: [dmEmbed] });
        } catch { dmStatus = '❌ Could not DM (DMs closed)'; }

        await member.ban({ reason: `${reason} | By: ${interaction.user.tag}`, deleteMessageDays: deleteDays });
      }

      await Activity.create({
        guildId: interaction.guildId,
        userId: target.id,
        type: 'warning',
        data: { action: 'ban', reason, moderatorId: interaction.user.id },
        createdAt: new Date()
      }).catch(() => { });

      const embed = await createCustomEmbed(interaction, {
        title: '⛔ User Banned',
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: `**${target.username}** has been permanently banned from **${interaction.guild.name}**.`,
        fields: [
          { name: '👤 Banned User', value: `**${target.username}** (\`${target.id}\`)`, inline: true },
          { name: '🛡️ Moderator', value: `**${interaction.user.username}**`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '📅 Messages Deleted', value: `\`${deleteDays}\` day(s)`, inline: true },
          { name: '🔔 DM Status', value: `\`${dmStatus}\``, inline: true }
        ],
        color: 'error',
        footer: 'uwu-chan Moderation Log'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ban_soft_${target.id}_${deleteDays}`)
          .setLabel('⚔️ Softban (Kick + Purge)')
          .setStyle(ButtonStyle.Warning),
        new ButtonBuilder()
          .setCustomId(`ban_appeal_info_${target.id}`)
          .setLabel('📋 Appeal Info')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('auto_v4_ban_user')
          .setLabel('🔄 Sync Live Data')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[ban_user] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Failed to execute ban. Check bot permissions.')] });
    }
  },

  async handleBanButtons(interaction, client) {
    const { customId, guild, member } = interaction;
    const parts = customId.split('_');
    const targetUserId = parts[2];

    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You require `Ban Members` permissions to use these controls.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (customId.startsWith('ban_soft_')) {
      const deleteDays = parseInt(parts[3]) || 0;
      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

      if (!targetMember) return interaction.editReply({ content: '❌ User no longer in server.' });
      if (!targetMember.kickable) return interaction.editReply({ content: '❌ I cannot kick this user (Role hierarchy).' });

      await targetMember.kick(`Softban by ${interaction.user.tag}`);
      await guild.bans.create(targetUserId, { deleteMessageDays: deleteDays, reason: `Softban purge by ${interaction.user.tag}` });
      await guild.bans.remove(targetUserId, 'Softban unban');

      const embed = createSuccessEmbed('🛡️ Softban Executed', `User <@${targetUserId}> was kicked and their messages from last ${deleteDays} days were purged.`);
      await interaction.editReply({ embeds: [embed] });
    } else if (customId.startsWith('ban_appeal_info_')) {
      const embed = await createCustomEmbed(interaction, {
        title: '📋 Appeal Protocol',
        description: `User <@${targetUserId}> can appeal their ban through the server's dedicated appeal form or by contacting administration directly.`,
        color: 'info'
      });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
