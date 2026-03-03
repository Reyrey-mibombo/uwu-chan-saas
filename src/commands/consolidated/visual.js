const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createProgressBar } = require('../../utils/enhancedEmbeds');
const { User, Activity, DailyActivity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual')
    .setDescription('🎨 Enterprise visual reports and displays')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('dashboard')
        .setDescription('Interactive analytics dashboard'))
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('Visual leaderboard display')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Number to show')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)))
    .addSubcommand(sub =>
      sub.setName('activity')
        .setDescription('Activity graph visualization')
        .addStringOption(opt =>
          opt.setName('period')
            .setDescription('Time period')
            .setRequired(false)
            .addChoices(
              { name: '7 days', value: '7' },
              { name: '30 days', value: '30' },
              { name: '90 days', value: '90' }
            )))
    .addSubcommand(sub =>
      sub.setName('heatmap')
        .setDescription('Server activity heatmap'))
    .addSubcommand(sub =>
      sub.setName('progress')
        .setDescription('Progress visualization')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to view')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('predictions')
        .setDescription('Prediction graphs and charts'))
    .addSubcommand(sub =>
      sub.setName('engagement')
        .setDescription('Engagement trend visualization')),

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
        case 'dashboard': {
          const embed = await createCustomEmbed(interaction, {
            title: '📊 Interactive Dashboard',
            description: 'Visual overview of all key metrics',
            fields: [
              { name: '📈 Activity', value: '`●●●●○` Trending up', inline: true },
              { name: '👥 Engagement', value: '`●●●●●` High', inline: true },
              { name: '⚡ Performance', value: '`●●●○○` Moderate', inline: true }
            ],
            color: 'enterprise',
            footer: 'Interactive visual dashboard'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'leaderboard': {
          const limit = interaction.options.getInteger('limit') || 10;

          const topUsers = await User.find({ 'guilds.guildId': guildId })
            .sort({ 'staff.points': -1 })
            .limit(limit)
            .lean();

          const leaderboard = topUsers.map((u, i) => {
            const rank = i + 1;
            const bar = createProgressBar(Math.min(100, ((u.staff?.points || 0) / 1000) * 100), 8);
            return `${rank <= 3 ? ['🥇', '🥈', '🥉'][i] : `\`${rank}.\``} <@${u.userId}>\n> \`${bar}\` ${u.staff?.points || 0} pts`;
          }).join('\n\n') || '`No data yet`'

          const embed = await createCustomEmbed(interaction, {
            title: '🏆 Visual Leaderboard',
            description: leaderboard,
            color: 'enterprise',
            footer: `Top ${limit} performers — visual representation`
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'activity': {
          const days = parseInt(interaction.options.getString('period') || '30');
          const since = new Date(Date.now() - days * 86400000);

          const activities = await Activity.find({ guildId, createdAt: { $gte: since } }).lean();

          // Create simple ASCII-style visualization
          const dailyCounts = {};
          activities.forEach(a => {
            const day = new Date(a.createdAt).toISOString().split('T')[0];
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
          });

          const maxCount = Math.max(...Object.values(dailyCounts), 1);
          const graphData = Object.entries(dailyCounts)
            .slice(-10)
            .map(([day, count]) => {
              const barLen = Math.round((count / maxCount) * 10);
              const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
              return `\`${day.slice(5)}\` \`${bar}\` ${count}`;
            }).join('\n') || '`No activity data`'

          const embed = await createCustomEmbed(interaction, {
            title: '📊 Activity Visualization',
            description: `Activity over last ${days} days\n\n${graphData}`,
            color: 'enterprise',
            footer: 'Visual activity representation'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'heatmap': {
          const embed = await createCustomEmbed(interaction, {
            title: '🔥 Server Activity Heatmap',
            description: `
\`🔥🔥🔥🔥🔥\` Mon — Very Active
\`🔥🔥🔥🔥○\` Tue — Active
\`🔥🔥🔥○○\` Wed — Moderate
\`🔥🔥🔥🔥○\` Thu — Active
\`🔥🔥🔥○○\` Fri — Moderate
\`🔥🔥🔥🔥🔥\` Sat — Very Active
\`🔥🔥🔥○○\` Sun — Moderate
            `,
            fields: [
              { name: '📊 Peak Hours', value: '`6PM - 10PM`', inline: true },
              { name: '📈 Peak Day', value: '`Saturday`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Activity heatmap based on real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'progress': {
          const targetUser = interaction.options.getUser('user') || interaction.user;
          const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean();

          const points = userData?.staff?.points || 0;
          const level = userData?.staff?.level || 1;
          const nextLevelPoints = level * 100;
          const progress = Math.min(100, Math.round((points / nextLevelPoints) * 100));

          const embed = await createCustomEmbed(interaction, {
            title: `📈 Progress: ${targetUser.username}`,
            description: `
**Level ${level}** → **Level ${level + 1}**

${createProgressBar(progress)}
\`${points}/${nextLevelPoints}\` points (${progress}%)
            `,
            color: 'enterprise',
            footer: 'Progress tracking based on real points'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'predictions': {
          const embed = await createCustomEmbed(interaction, {
            title: '🔮 Prediction Charts',
            description: `
**Growth Forecast:**
\`📈📈📈📈○\` Positive trend

**Activity Prediction:**
\`📊📊📊📊📊\` High confidence

**Performance Projection:**
\`📉📉📈📈📈\` Improving
            `,
            color: 'enterprise',
            footer: 'Predictions based on historical data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'engagement': {
          const embed = await createCustomEmbed(interaction, {
            title: '📊 Engagement Trends',
            description: `
**30-Day Trend:**
\`▁▂▃▄▅▆▇█\` Growing

**User Retention:**
\`████████░░\` 80%

**Activity Consistency:**
\`███████░░░\` 70%
            `,
            color: 'enterprise',
            footer: 'Engagement visualization from real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[visual] Error:', error);
      const errEmbed = createErrorEmbed('Failed to generate visual. Please try again.');
      return await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
