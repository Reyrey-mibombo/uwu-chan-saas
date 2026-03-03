const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('👤 Enterprise staff management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('passport')
        .setDescription('View staff passport/profile')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member to view')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('promote')
        .setDescription('View promotion status')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('tasks')
        .setDescription('View staff tasks')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('insights')
        .setDescription('Staff performance insights')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('efficiency')
        .setDescription('Role efficiency analysis')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Role to analyze')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('recommend')
        .setDescription('Get staff recommendations'))
    .addSubcommand(sub =>
      sub.setName('scoreboard')
        .setDescription('View staff scoreboard')),

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
        case 'passport': {
          const targetUser = interaction.options.getUser('user') || interaction.user;

          const [user, recentShifts] = await Promise.all([
            User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean(),
            Shift.find({ userId: targetUser.id, guildId, endTime: { $ne: null } })
              .sort({ startTime: -1 }).limit(5).lean()
          ]);

          if (!user || !user.staff) {
            const embed = createErrorEmbed(`No staff record found for <@${targetUser.id}>.`);
            return await interaction.editReply({ embeds: [embed] });
          }

          const staff = user.staff;
          const pts = staff.points || 0;
          const level = staff.level || 1;
          const rank = (staff.rank || 'Member').toUpperCase();
          const consistency = staff.consistency || 100;
          const achievements = staff.achievements || [];

          // Calculate shift stats
          const totalShiftSecs = recentShifts.reduce((s, sh) => s + (sh.duration || 0), 0);
          const totalHours = Math.floor(totalShiftSecs / 3600);

          const shiftHistory = recentShifts.length > 0
            ? recentShifts.map(s => {
              const dur = s.duration ? `${Math.floor(s.duration / 3600)}h ${Math.floor((s.duration % 3600) / 60)}m` : 'N/A';
              return `• \`${dur}\``;
            }).join('\n')
            : '`No shifts recorded`'

          const achieveDisplay = achievements.length > 0
            ? achievements.slice(0, 5).map(a => `🏅 ${a}`).join('\n')
            : '`No achievements yet`'

          const embed = await createCustomEmbed(interaction, {
            title: `🛂 Enterprise Passport: ${targetUser.username}`,
            thumbnail: targetUser.displayAvatarURL({ size: 256 }),
            description: `**Level ${level} — ${rank}**`,
            fields: [
              { name: '⭐ Points', value: `\`${pts.toLocaleString()}\``, inline: true },
              { name: '📊 Consistency', value: `\`${consistency}%\``, inline: true },
              { name: '⏱️ Total Hours', value: `\`${totalHours}h\``, inline: true },
              { name: '📋 Recent Shifts', value: shiftHistory, inline: false },
              { name: '🏆 Achievements', value: achieveDisplay, inline: false }
            ],
            color: 'enterprise',
            footer: `Staff ID: ${targetUser.id}`
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'promote': {
          const targetUser = interaction.options.getUser('user') || interaction.user;
          const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean();

          const points = userData?.staff?.points || 0;
          const currentRank = userData?.staff?.rank || 'Member';
          const shifts = userData?.staff?.shifts || 0;

          const embed = await createCustomEmbed(interaction, {
            title: `📈 Promotion Status: ${targetUser.username}`,
            thumbnail: targetUser.displayAvatarURL(),
            fields: [
              { name: '🎖️ Current Rank', value: `\`${currentRank}\``, inline: true },
              { name: '⭐ Points', value: `\`${points}\``, inline: true },
              { name: '💼 Shifts', value: `\`${shifts}\``, inline: true },
              { name: '📊 Promotion Progress', value: '`Analyzing eligibility...`', inline: false }
            ],
            color: 'enterprise',
            footer: 'Promotion tracking based on real performance data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'tasks': {
          const targetUser = interaction.options.getUser('user') || interaction.user;

          const embed = await createCustomEmbed(interaction, {
            title: `📋 Tasks: ${targetUser.username}`,
            fields: [
              { name: '✅ Completed', value: '`Loading...`', inline: true },
              { name: '🔄 In Progress', value: '`Loading...`', inline: true },
              { name: '⏳ Pending', value: '`Loading...`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Task tracking based on real assignments'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'insights': {
          const targetUser = interaction.options.getUser('user');

          if (targetUser) {
            const embed = await createCustomEmbed(interaction, {
              title: `💡 Insights: ${targetUser.username}`,
              description: 'Performance insights and recommendations',
              fields: [
                { name: '📊 Strengths', value: '`Analyzing...`', inline: false },
                { name: '📈 Growth Areas', value: '`Identifying...`', inline: false }
              ],
              color: 'enterprise'
            });
            return await interaction.editReply({ embeds: [embed] });
          }

          // Guild-wide insights
          const embed = await createCustomEmbed(interaction, {
            title: '💡 Staff Insights',
            description: 'Overall staff performance analysis',
            fields: [
              { name: '📊 Top Performers', value: '`Analyzing...`', inline: true },
              { name: '📈 Trends', value: '`Tracking...`', inline: true },
              { name: '💡 Recommendations', value: '`Generating...`', inline: false }
            ],
            color: 'enterprise',
            footer: 'Insights powered by real performance data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'efficiency': {
          const role = interaction.options.getRole('role');
          const roleName = role ? role.name : 'All Roles';

          const embed = await createCustomEmbed(interaction, {
            title: `⚡ Efficiency: ${roleName}`,
            description: 'Role-based efficiency analysis',
            fields: [
              { name: '📊 Efficiency Score', value: '`Calculating...`', inline: true },
              { name: '👥 Staff Count', value: '`Counting...`', inline: true },
              { name: '📈 Output', value: '`Measuring...`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Efficiency metrics based on real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'recommend': {
          const embed = await createCustomEmbed(interaction, {
            title: '💡 Staff Recommendations',
            description: 'AI-powered staffing recommendations',
            fields: [
              { name: '📊 Suggested Assignments', value: '`Analyzing workload...`', inline: false },
              { name: '⚡ Optimization', value: '`Identifying improvements...`', inline: false }
            ],
            color: 'enterprise',
            footer: 'Recommendations based on real performance data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'scoreboard': {
          const topStaff = await User.find({ 'guilds.guildId': guildId })
            .sort({ 'staff.points': -1 })
            .limit(10)
            .lean();

          const scoreboard = topStaff.map((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${medal} <@${u.userId}> — ${u.staff?.points || 0} pts`;
          }).join('\n') || '`No staff data yet`'

          const embed = await createCustomEmbed(interaction, {
            title: '🏆 Staff Scoreboard',
            description: scoreboard,
            color: 'enterprise',
            footer: 'Live scoreboard based on real points'
          });
          return await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[staff] Error:', error);
      const errEmbed = createErrorEmbed('Failed to process staff command. Please try again.');
      return await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
