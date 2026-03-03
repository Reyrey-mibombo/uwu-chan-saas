const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild, Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_dashboard')
    .setDescription('?? Enterprise fully interactive server dashboard with real-time tab navigation'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      let activeTab = 'overview';

      const buildTabEmbed = async (tab) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 86400000);

        if (tab === 'staff') {
          const users = await User.find({ userId: { $exists: true }, 'staff.points': { $gt: 0 } })
            .sort({ 'staff.points': -1 }).limit(10).lean();
          const topList = users.length > 0
            ? users.map((u, i) => `\`${String(i + 1).padStart(2, '0')}\` **${u.username || u.userId}** � \`${(u.staff?.points || 0).toLocaleString()} pts\``)
              .join('\n')
            : '`No staff data yet`';
          const avgConsistency = users.length > 0
            ? (users.reduce((s, u) => s + (u.staff?.consistency || 100), 0) / users.length).toFixed(1)
            : '100';

          return createCustomEmbed(interaction, {
            title: `?? Staff Overview � ${interaction.guild.name}`,
            thumbnail: interaction.guild.iconURL({ dynamic: true }),
            description: `Top staff members and performance metrics.`,
            fields: [
              { name: '?? Top 10 Staff', value: topList, inline: false },
              { name: '?? Avg Consistency', value: `\`${createProgressBar(Math.round(parseFloat(avgConsistency)))}\` ${avgConsistency}%`, inline: false },
              { name: '?? Total Tracked Staff', value: `\`${users.length}\``, inline: true }
            ],
            color: 'enterprise',
            footer: 'uwu-chan � Enterprise Staff Tab'
          });
        }

        if (tab === 'moderation') {
          const { Warning } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
          const [weekWarnings, totalWarnings] = await Promise.all([
            Warning.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
            Warning.find({ guildId }).lean()
          ]);
          const highSeverity = weekWarnings.filter(w => w.severity === 'high').length;
          const recentWarnUsers = [...new Set(weekWarnings.map(w => w.userId))];

          return createCustomEmbed(interaction, {
            title: `??? Moderation Overview � ${interaction.guild.name}`,
            thumbnail: interaction.guild.iconURL({ dynamic: true }),
            description: `Real-time moderation statistics for the server.`,
            fields: [
              { name: '?? Warnings This Week', value: `\`${weekWarnings.length}\``, inline: true },
              { name: '?? High Severity', value: `\`${highSeverity}\``, inline: true },
              { name: '?? Users Warned', value: `\`${recentWarnUsers.length}\``, inline: true },
              { name: '?? Total Warnings (All Time)', value: `\`${totalWarnings.length}\``, inline: true },
              {
                name: '??? Server Verification',
                value: `\`${interaction.guild.verificationLevel}\` � Explicit Filter: \`${interaction.guild.explicitContentFilter}\``,
                inline: false
              }
            ],
            color: 'enterprise',
            footer: 'uwu-chan � Enterprise Moderation Tab'
          });
        }

        // Default: Overview tab
        const [weekActs, guild] = await Promise.all([
          Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
          Guild.findOne({ guildId }).lean()
        ]);

        const memberCount = interaction.guild.memberCount;
        const activeUsers = new Set(weekActs.map(a => a.userId)).size;
        const engRate = Math.round((activeUsers / Math.max(memberCount, 1)) * 100);
        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        const tier = guild?.premium?.tier || 'free';
        const cmds = guild?.stats?.commandsUsed || weekActs.filter(a => a.type === 'command').length;

        return createCustomEmbed(interaction, {
          title: `?? Server Dashboard � ${interaction.guild.name}`,
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: `Welcome to the Enterprise Interactive Dashboard. Navigate tabs below.`,
          fields: [
            { name: '?? Members', value: `\`${memberCount.toLocaleString()}\``, inline: true },
            { name: '? Active (7d)', value: `\`${activeUsers}\``, inline: true },
            { name: '?? Engagement', value: `\`${createProgressBar(engRate)}\` **${engRate}%**`, inline: false },
            { name: '? Commands Used', value: `\`${cmds.toLocaleString()}\``, inline: true },
            { name: '?? Bot Uptime', value: `\`${uptimeStr}\``, inline: true },
            { name: '?? License Tier', value: `\`${tier.toUpperCase()}\``, inline: true },
            { name: '?? Server Created', value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:D>`, inline: true }
          ],
          color: 'enterprise',
          footer: 'uwu-chan � Enterprise Interactive Dashboard'
        });
      };

      const getRow = (tab) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dash_overview').setLabel('?? Overview').setStyle(tab === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('dash_staff').setLabel('?? Staff').setStyle(tab === 'staff' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('dash_moderation').setLabel('??? Moderation').setStyle(tab === 'moderation' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({
        embeds: [await buildTabEmbed(activeTab)],
        components: [getRow(activeTab)]
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 300000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();
        activeTab = i.customId.replace('dash_', '');
        await i.editReply({ embeds: [await buildTabEmbed(activeTab)], components: [getRow(activeTab)] });
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => { });
      });
    } catch (error) {
      console.error('[interactive_dashboard] Error:', error);
      const errEmbed = createErrorEmbed('Failed to load the interactive dashboard.');
            if (interaction.deferred || interaction.replied) { return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};




