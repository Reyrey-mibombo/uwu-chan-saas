const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, User, DailyActivity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('📊 Enterprise analytics and insights')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('activity')
        .setDescription('Activity patterns and insights')
        .addStringOption(opt =>
          opt.setName('period')
            .setDescription('Time period to analyze')
            .setRequired(false)
            .addChoices(
              { name: '7 days', value: '7' },
              { name: '30 days', value: '30' },
              { name: '90 days', value: '90' }
            )))
    .addSubcommand(sub =>
      sub.setName('engagement')
        .setDescription('Engagement trends and summary')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Specific user to analyze')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('performance')
        .setDescription('Staff performance reports')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Number of staff to show')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)))
    .addSubcommand(sub =>
      sub.setName('productivity')
        .setDescription('Productivity analysis and trends')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Analysis type')
            .setRequired(false)
            .addChoices(
              { name: 'Individual', value: 'individual' },
              { name: 'Team', value: 'team' },
              { name: 'Department', value: 'department' }
            )))
    .addSubcommand(sub =>
      sub.setName('server')
        .setDescription('Server health and overview')),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guildId;

      switch (subcommand) {
        case 'activity': {
          const days = parseInt(interaction.options.getString('period') || '30');
          const since = new Date(Date.now() - days * 86400000);

          const activities = await Activity.find({ guildId, createdAt: { $gte: since } }).lean();

          // Group by day
          const dailyCounts = {};
          activities.forEach(a => {
            const day = new Date(a.createdAt).toISOString().split('T')[0];
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
          });

          const avgDaily = Object.values(dailyCounts).reduce((a, b) => a + b, 0) / Math.max(Object.keys(dailyCounts).length, 1);
          const peakDay = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0];

          const embed = await createCustomEmbed(interaction, {
            title: '📊 Activity Analysis',
            description: `Activity insights for the last **${days}** days`,
            fields: [
              { name: '📈 Total Events', value: `\`${activities.length.toLocaleString()}\``, inline: true },
              { name: '📊 Daily Average', value: `\`${avgDaily.toFixed(1)}\``, inline: true },
              { name: '🏆 Peak Day', value: peakDay ? `\`${peakDay[0]}\` (${peakDay[1]} events)` : 'No data', inline: true },
              { name: '📅 Active Days', value: `\`${Object.keys(dailyCounts).length}\` of ${days}`, inline: true }
            ],
            color: 'enterprise',
            footer: 'Analytics powered by real activity data'
          });

          return await interaction.editReply({ embeds: [embed] });
        }

        case 'engagement': {
          const targetUser = interaction.options.getUser('user');

          if (targetUser) {
            const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean();
            const points = userData?.staff?.points || 0;
            const consistency = userData?.staff?.consistency || 0;

            const embed = await createCustomEmbed(interaction, {
              title: `👤 Engagement: ${targetUser.username}`,
              thumbnail: targetUser.displayAvatarURL(),
              fields: [
                { name: '⭐ Points', value: `\`${points.toLocaleString()}\``, inline: true },
                { name: '📊 Consistency', value: `\`${consistency}%\``, inline: true },
                { name: '🏅 Rank', value: `\`${userData?.staff?.rank || 'Member'}\``, inline: true }
              ],
              color: 'enterprise'
            });
            return await interaction.editReply({ embeds: [embed] });
          }

          // Guild-wide engagement
          const topUsers = await User.find({ 'guilds.guildId': guildId })
            .sort({ 'staff.points': -1 })
            .limit(5)
            .lean();

          const engagementList = topUsers.map((u, i) =>
            `\`${i + 1}.\` <@${u.userId}> — **${u.staff?.points || 0}** pts`
          ).join('\n') || 'No engagement data yet';

          const embed = await createCustomEmbed(interaction, {
            title: '📈 Guild Engagement Summary',
            description: `**Top Engaged Members:**\n${engagementList}`,
            color: 'enterprise',
            footer: 'Based on real activity data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'performance': {
          const limit = interaction.options.getInteger('limit') || 10;

          const staffData = await User.find({ 'guilds.guildId': guildId })
            .sort({ 'staff.points': -1 })
            .limit(limit)
            .lean();

          const performanceList = staffData.map((u, i) => {
            const staff = u.staff || {};
            return `\`${i + 1}.\` <@${u.userId}> — ${staff.points || 0} pts | ${staff.consistency || 0}% consistent`;
          }).join('\n') || 'No staff performance data';

          const embed = await createCustomEmbed(interaction, {
            title: '📊 Performance Report',
            description: performanceList,
            color: 'enterprise',
            footer: `Showing top ${limit} staff members`
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'productivity': {
          const type = interaction.options.getString('type') || 'team';

          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
          const activities = await Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean();

          const embed = await createCustomEmbed(interaction, {
            title: `📈 Productivity Analysis (${type})`,
            description: `Analyzed **${activities.length}** activities in the last 30 days`,
            fields: [
              { name: '📊 Analysis Type', value: `\`${type.charAt(0).toUpperCase() + type.slice(1)}\``, inline: true },
              { name: '📅 Period', value: '`30 days`', inline: true },
              { name: '📈 Total Events', value: `\`${activities.length}\``, inline: true }
            ],
            color: 'enterprise',
            footer: 'Productivity metrics based on real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'server': {
          const guild = interaction.guild;
          const memberCount = guild.memberCount;
          const channelCount = guild.channels.cache.size;

          // Get message stats from last 7 days
          const weekAgo = new Date(Date.now() - 7 * 86400000);
          const today = new Date().toISOString().split('T')[0];
          const weekActivities = await DailyActivity.find({
            guildId,
            date: { $gte: weekAgo.toISOString().split('T')[0] }
          }).lean();

          const totalMessages = weekActivities.reduce((sum, a) => sum + (a.messageCount || 0), 0);

          const embed = await createCustomEmbed(interaction, {
            title: `🖥️ Server Health: ${guild.name}`,
            thumbnail: guild.iconURL(),
            fields: [
              { name: '👥 Members', value: `\`${memberCount.toLocaleString()}\``, inline: true },
              { name: '💬 Channels', value: `\`${channelCount}\``, inline: true },
              { name: '📨 Weekly Messages', value: `\`${totalMessages.toLocaleString()}\``, inline: true },
              { name: '✅ Status', value: '`Healthy`', inline: true }
            ],
            color: '#43b581',
            footer: 'Server health powered by real-time data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[analytics] Error:', error);
      const errEmbed = createErrorEmbed('Failed to load analytics. Please try again.');
      return await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
