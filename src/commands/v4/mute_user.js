const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute_user')
    .setDescription('🔇 Timeout/mute a member using Discord native timeout API')
    .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Mute duration')
        .addChoices(
          { name: '1 Minute', value: '60000' },
          { name: '5 Minutes', value: '300000' },
          { name: '10 Minutes', value: '600000' },
          { name: '30 Minutes', value: '1800000' },
          { name: '1 Hour', value: '3600000' },
          { name: '6 Hours', value: '21600000' },
          { name: '24 Hours', value: '86400000' },
          { name: '1 Week', value: '604800000' }
        )
        .setRequired(true)
    )
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
      const target = interaction.options.getUser('user');
      const durationMs = parseInt(interaction.options.getString('duration'));
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await interaction.editReply({ embeds: [createErrorEmbed('You lack the `Moderate Members` permission.')] });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return await interaction.editReply({ embeds: [createErrorEmbed('User not found in this server.')] });
      if (!member.moderatable) return await interaction.editReply({ embeds: [createErrorEmbed(`I cannot mute **${target.username}** - their role is higher than mine.`)] });

      await member.timeout(durationMs, `${reason} | By: ${interaction.user.tag}`);

      await Activity.create({
        guildId: interaction.guildId,
        userId: target.id,
        type: 'warning',
        data: { action: 'mute', durationMs, reason, moderatorId: interaction.user.id },
        createdAt: new Date()
      }).catch(() => { });

      let dmStatus = '✅ DM Sent';
      try {
        const dmEmbed = createCustomEmbed(interaction, {
          title: '🔇 You have been muted',
          description: `You were timed out in **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Duration:** ${formatDuration(durationMs)}\n**Moderator:** ${interaction.user.tag}`,
          color: 'warning'
        });
        await target.send({ embeds: [await dmEmbed] });
      } catch { dmStatus = '❌ DMs closed'; }

      const embed = await createCustomEmbed(interaction, {
        title: '🔇 User Muted',
        thumbnail: target.displayAvatarURL(),
        description: `**${target.username}** has been timed out in **${interaction.guild.name}**.`,
        fields: [
          { name: '👤 User', value: `**${target.username}** (\`${target.id}\`)`, inline: true },
          { name: '🛡️ Moderator', value: `**${interaction.user.username}**`, inline: true },
          { name: '🕒 Duration', value: `\`${formatDuration(durationMs)}\``, inline: true },
          { name: '🔓 Unmuted At', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:f>`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '🔔 DM Status', value: `\`${dmStatus}\``, inline: true }
        ],
        color: 'warning',
        footer: 'uwu-chan Moderation Log'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mute_unmute_${target.id}`)
          .setLabel('🔓 Unmute User')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`mute_extend_10m_${target.id}`)
          .setLabel('+10m')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`mute_extend_1h_${target.id}`)
          .setLabel('+1h')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('auto_v4_mute_user')
          .setLabel('🔄 Sync Live Data')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[mute_user] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Failed to mute user. Check my permissions.')] });
    }
  },

  async handleMuteButtons(interaction, client) {
    const { customId, guild, member } = interaction;
    const parts = customId.split('_');
    const targetUserId = parts[parts.length - 1];

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You require `Moderate Members` permissions to manage timeouts.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ User no longer in server.' });

    if (customId.startsWith('mute_unmute_')) {
      await targetMember.timeout(null, `Unmuted by ${interaction.user.tag}`);
      await interaction.editReply({ embeds: [createSuccessEmbed('🔓 User Unmuted', `<@${targetUserId}> has been released from timeout.`)] });
    } else if (customId.startsWith('mute_extend_')) {
      const extensionMs = customId.includes('_10m_') ? 10 * 60 * 1000 : 60 * 60 * 1000;
      const currentTimeout = targetMember.communicationDisabledUntilTimestamp || Date.now();
      const newTimeout = currentTimeout + extensionMs;

      if (newTimeout - Date.now() > 28 * 24 * 60 * 60 * 1000) {
        return interaction.editReply({ content: '❌ Cannot extend beyond Discord\'s 28-day limit.' });
      }

      await targetMember.timeout(newTimeout - Date.now(), `Duration extended by ${interaction.user.tag}`);
      await interaction.editReply({ embeds: [createSuccessEmbed('🕒 Timeout Extended', `Added **${customId.includes('_10m_') ? '10m' : '1h'}** to <@${targetUserId}>'s sentence.`)] });
    }
  }
};

function formatDuration(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
