const { SlashCommandBuilder, PermissionFlagsBits, AuditLogEvent, ComponentType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

const ACTION_MAP = {
  all: null,
  ban: AuditLogEvent.MemberBanAdd,
  kick: AuditLogEvent.MemberKick,
  mute: AuditLogEvent.MemberUpdate,
  roles: AuditLogEvent.MemberRoleUpdate,
  channels: AuditLogEvent.ChannelCreate
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit_logs')
    .setDescription('?? View real Discord audit logs with filtering and pagination')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Filter by action type')
        .addChoices(
          { name: 'All Actions', value: 'all' },
          { name: '?? Bans', value: 'ban' },
          { name: '?? Kicks', value: 'kick' },
          { name: '?? Mutes/Updates', value: 'mute' },
          { name: '?? Role Changes', value: 'roles' },
          { name: '?? Channel Changes', value: 'channels' }
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        return interaction.editReply({ embeds: [createErrorEmbed('You need the `View Audit Log` permission.')] });
      }

      const filter = interaction.options.getString('filter') || 'all';
      const actionType = ACTION_MAP[filter];

      const fetchOptions = { limit: 50 };
      if (actionType !== null) fetchOptions.type = actionType;

      const logs = await interaction.guild.fetchAuditLogs(fetchOptions);
      const entries = [...logs.entries.values()];

      if (entries.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No audit log entries found for this filter.')] });
      }

      const perPage = 8;
      let page = 0;
      const totalPages = Math.ceil(entries.length / perPage);

      const buildEmbed = async (p) => {
        const slice = entries.slice(p * perPage, (p + 1) * perPage);
        const lines = slice.map(e => {
          const executor = e.executor ? `**${e.executor.username}**` : '`Unknown`';
          const target = e.target?.username ? `? **${e.target.username}**` : '';
          const reason = e.reason ? `*"${e.reason.substring(0, 40)}"*` : '';
          const timeAgo = `<t:${Math.floor(e.createdTimestamp / 1000)}:R>`;
          return `${executor} ${target} — \`${e.actionType}\` ${timeAgo}${reason ? `\n> ${reason}` : ''}`;
        });

        return createCustomEmbed(interaction, {
          title: `?? Audit Logs — ${interaction.guild.name}`,
          description: lines.join('\n\n') || '*No entries*',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          fields: [
            { name: '?? Filter', value: `\`${filter.toUpperCase()}\``, inline: true },
            { name: '?? Entries Shown', value: `\`${slice.length}\` / \`${entries.length}\``, inline: true },
            { name: '?? Page', value: `\`${p + 1} / ${totalPages}\``, inline: true }
          ],
          color: 'premium',
          footer: 'uwu-chan • Real Discord Audit Log'
        });
      };

      const getRow = (p) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('audit_prev').setLabel('? Previous').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('audit_next').setLabel('Next ?').setStyle(ButtonStyle.Primary).setDisabled(p === totalPages - 1)
      );

      const msg = await interaction.editReply({
        embeds: [await buildEmbed(page)],
        components: totalPages > 1 ? [getRow(page)] : []
      });

      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.customId === 'audit_prev') page = Math.max(0, page - 1);
        if (i.customId === 'audit_next') page = Math.min(totalPages - 1, page + 1);
        await i.editReply({ embeds: [await buildEmbed(page)], components: [getRow(page)] });
      });

      collector.on('end', () => { msg.edit({ components: [] }).catch(() => { }); });
    } catch (error) {
      console.error('[audit_logs] Error:', error);
      const errEmbed = createErrorEmbed('Failed to fetch audit logs. Check my permissions (`View Audit Log`).');
      if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errEmbed] });
      else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};

