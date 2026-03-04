const { SlashCommandBuilder, PermissionFlagsBits, AuditLogEvent, ComponentType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');

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
    .setDescription('📋 Real-time Enterprise Audit: Macroscopic Sector Surveillance')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Initial surveillance filter')
        .addChoices(
          { name: 'All Actions', value: 'all' },
          { name: '🔨 Bans', value: 'ban' },
          { name: '👢 Kicks', value: 'kick' },
          { name: '🔇 Mutes/Updates', value: 'mute' },
          { name: '🎭 Role Changes', value: 'roles' },
          { name: '🌐 Channel Changes', value: 'channels' }
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
      }

      const filter = interaction.options?.getString('filter') || 'all';
      await this.renderAuditPortal(interaction, filter, 0);

    } catch (error) {
      console.error('[audit_logs] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Surveillance failure: Unable to synchronize macroscopic audit logs.')] });
    }
  },

  async renderAuditPortal(interaction, filter, page) {
    const actionType = ACTION_MAP[filter];
    const fetchOptions = { limit: 50 };
    if (actionType !== null) fetchOptions.type = actionType;

    const logs = await interaction.guild.fetchAuditLogs(fetchOptions);
    const entries = [...logs.entries.values()];

    if (entries.length === 0) {
      return interaction.editReply({ embeds: [createErrorEmbed(`No recent audit vectors detected for filter: \`${filter}\`.`)] });
    }

    const perPage = 5;
    const totalPages = Math.ceil(entries.length / perPage);
    const slice = entries.slice(page * perPage, (page + 1) * perPage);

    const lines = slice.map(e => {
      const executor = e.executor ? `**${e.executor.username}**` : '`Unknown`';
      const target = e.target?.username ? `👤 **${e.target.username}**` : '';
      const reason = e.reason ? `*"${e.reason.substring(0, 40)}"*` : '';
      const timeAgo = `<t:${Math.floor(e.createdTimestamp / 1000)}:R>`;
      return `\`ID:${e.id}\` ${executor} ${target} ➔ \`${e.actionType}\` ${timeAgo}${reason ? `\n> ${reason}` : ''}`;
    });

    const embed = await createCustomEmbed(interaction, {
      title: `📋 Macroscopic Audit: ${interaction.guild.name}`,
      description: `### 🔍 Sector Surveillance Active\nTracing the last **50** macroscopic transitions in the server grid.\n\n${lines.join('\n\n')}`,
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      fields: [
        { name: '📡 Filter', value: `\`${filter.toUpperCase()}\``, inline: true },
        { name: '💾 Page', value: `\`${page + 1} / ${totalPages}\``, inline: true },
        { name: '✨ Status', value: '`🟢 SYNCED`', inline: true }
      ],
      color: 'premium',
      footer: `Nexus Sync: ${new Date().toLocaleTimeString()} • V4 Oversight`
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`audit_page_prev_${filter}_${page}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`audit_page_next_${filter}_${page}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`audit_details_${slice[0]?.id}`)
        .setLabel('Deep Scan (Top)')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍'),
      new ButtonBuilder()
        .setCustomId('auto_v4_audit_logs')
        .setLabel('Live Refresh')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄')
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleAuditButtons(interaction, client) {
    const { customId, member } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return interaction.reply({ content: '❌ Authority level insufficient for sector surveillance.', ephemeral: true });
    }

    const parts = customId.split('_');
    const action = parts[1];

    if (action === 'details') {
      const logId = parts[2];
      const logs = await interaction.guild.fetchAuditLogs({ limit: 50 });
      const entry = logs.entries.get(logId);

      if (!entry) return interaction.reply({ content: '❌ Audit vector lost or expired.', ephemeral: true });

      const detailEmbed = createPremiumEmbed()
        .setTitle(`🔍 Deep Scan: Entry [${logId}]`)
        .setDescription(`\`\`\`json\n${JSON.stringify({
          action: entry.action,
          executor: entry.executor?.tag,
          target: entry.target?.tag || entry.target?.id,
          reason: entry.reason,
          changes: entry.changes
        }, null, 2).slice(0, 1900)}\n\`\`\``);

      return interaction.reply({ embeds: [detailEmbed], ephemeral: true });
    }

    const filter = parts[2];
    let page = parseInt(parts[3]);

    if (action === 'page') {
      const direction = parts[1] === 'prev' ? -1 : 1;
      page += direction;
    }

    await interaction.deferUpdate();
    await this.renderAuditPortal(interaction, filter, page);
  }
};
