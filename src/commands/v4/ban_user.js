const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban_user')
    .setDescription('?? Ban a member from this server with reason, DM, and audit log')
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
        return const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_ban_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You lack the `Ban Members` permission.')], components: [row] });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        // User may still be bannable even if not in server
        try {
          await interaction.guild.bans.create(target.id, { reason: `${reason} | By: ${interaction.user.tag}`, deleteMessageDays: deleteDays });
        } catch (e) {
          return const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_ban_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Could not ban **${target.username}**. They may not be in the server or I lack permissions.`)], components: [row] });
        }
      } else {
        if (!member.bannable) {
          return const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_ban_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`I cannot ban **${target.username}**. Their role is higher than mine.`)], components: [row] });
        }

        // DM the user before banning
        let dmStatus = '? DM Sent';
        try {
          const dmEmbed = createErrorEmbed(`You have been **banned** from **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`);
          dmEmbed.setTitle('?? You were banned');
          await target.send({ embeds: [dmEmbed] });
        } catch { dmStatus = '? Could not DM (DMs closed)'; }

        await member.ban({ reason: `${reason} | By: ${interaction.user.tag}`, deleteMessageDays: deleteDays });
      }

      // Log to Activity collection
      await Activity.create({
        guildId: interaction.guildId,
        userId: target.id,
        type: 'warning',
        data: { action: 'ban', reason, moderatorId: interaction.user.id },
        createdAt: new Date()
      }).catch(() => { });

      // Log to mod channel
      const { Guild } = require('../../database/mongo');
      const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();
      if (guildData?.settings?.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(guildData.settings.logChannel);
        if (logChannel) {
          const logEmbed = createCustomEmbed(interaction, {
            title: '?? Member Banned',
            fields: [
              { name: '?? Banned User', value: `**${target.username}** (\`${target.id}\`)`, inline: true },
              { name: '??? Moderator', value: `**${interaction.user.username}**`, inline: true },
              { name: '?? Reason', value: reason, inline: false }
            ],
            color: 'error'
          });
          logChannel.send({ embeds: [await logEmbed] }).catch(() => { });
        }
      }

      const embed = await createCustomEmbed(interaction, {
        title: '?? User Banned',
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: `**${target.username}** has been permanently banned from **${interaction.guild.name}**.`,
        fields: [
          { name: '?? Banned User', value: `**${target.username}** (\`${target.id}\`)`, inline: true },
          { name: '??? Moderator', value: `**${interaction.user.username}**`, inline: true },
          { name: '?? Reason', value: reason, inline: false },
          { name: '??? Messages Deleted', value: `\`${deleteDays}\` day(s)`, inline: true },
          { name: '?? DM Status', value: `\`${dmStatus || '?'}\``, inline: true }
        ],
        color: 'error',
        footer: 'uwu-chan • Moderation Log'
      });

      await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_ban_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[ban_user] Error:', error);
      const errEmbed = createErrorEmbed('Failed to execute ban. Check bot permissions.');
      if (interaction.deferred || interaction.replied) await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_ban_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
      else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};

