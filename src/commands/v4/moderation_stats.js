const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed, createCustomEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_stats')
    .setDescription('📊 View macroscopic moderation statistics and intervention volume')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Initial time period')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'All Time', value: 'all' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter records by specific moderator or subject')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
      const period = interaction.options?.getString('period') || 'week';
      const user = interaction.options?.getUser('user');
      await this.renderStats(interaction, period, user?.id);
    } catch (error) {
      console.error('[moderation_stats] Error:', error);
      await interaction.editReply({ content: '❌ Statistical re-aggregation failed.' });
    }
  },

  async renderStats(interaction, period, filterUserId) {
    const guildId = interaction.guildId;
    let startDate = new Date();

    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else startDate = new Date(0);

    const query = {
      guildId,
      type: { $in: ['warning', 'command'] },
      createdAt: { $gte: startDate }
    };

    if (filterUserId) query.userId = filterUserId;

    const actions = await Activity.aggregate([
      { $match: query },
      { $group: { _id: '$data.action', count: { $sum: 1 } } }
    ]);

    const stats = { warn: 0, ban: 0, kick: 0, mute: 0, strike: 0 };
    actions.forEach(a => { if (stats.hasOwnProperty(a._id)) stats[a._id] = a.count; });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const embed = await createCustomEmbed(interaction, {
      title: `📊 Moderation Analysis: ${period.toUpperCase()}`,
      description: `### 📈 Statistical Intervention Pulse\nConsolidated data for sector **${interaction.guild.name}**. Filters applied: \`${filterUserId || 'Global'}\`.\n\n**⭐ Enterprise ANALYTICS ACTIVE**`,
      fields: [
        { name: '⚠️ Warnings', value: `\`${stats.warn}\``, inline: true },
        { name: '🔨 Bans', value: `\`${stats.ban}\``, inline: true },
        { name: '👢 Kicks', value: `\`${stats.kick}\``, inline: true },
        { name: '🔇 Mutes', value: `\`${stats.mute}\``, inline: true },
        { name: '🚨 Strikes', value: `\`${stats.strike}\``, inline: true },
        { name: '📊 Total Pulse', value: `\`${total}\``, inline: true }
      ],
      color: total > 20 ? 'premium' : 'primary',
      footer: `Data Refresh: ${new Date().toLocaleTimeString()} • V4 Analytics`
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_period_today_${filterUserId || 'none'}`)
        .setLabel('Today')
        .setStyle(period === 'today' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_period_week_${filterUserId || 'none'}`)
        .setLabel('Week')
        .setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_period_all_${filterUserId || 'none'}`)
        .setLabel('All-Time')
        .setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('auto_v4_moderation_stats')
        .setLabel('🔄 Sync')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleStatsButtons(interaction, client) {
    const { customId, member } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Authority insufficient for analytics control.', ephemeral: true });
    }

    const parts = customId.split('_');
    const period = parts[2];
    const filterUserId = parts[3] === 'none' ? null : parts[3];

    await interaction.deferUpdate();
    await this.renderStats(interaction, period, filterUserId);
  }
};
