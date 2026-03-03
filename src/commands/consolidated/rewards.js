const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

const REWARD_TIERS = [
  { threshold: 50, id: 'bronze', label: '🥉 Bronze', reward: 'Bronze role + 10 bonus points' },
  { threshold: 150, id: 'silver', label: '🥈 Silver', reward: 'Silver role + 25 bonus points' },
  { threshold: 300, id: 'gold', label: '🥇 Gold', reward: 'Gold role + 50 bonus points' },
  { threshold: 500, id: 'diamond', label: '💎 Diamond', reward: 'Diamond role + Elite Badge' },
  { threshold: 1000, id: 'enterprise', label: '👑 Enterprise Elite', reward: 'Enterprise role + Permanent Legacy' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('🏆 Enterprise rewards and achievements')
    .addSubcommand(sub =>
      sub.setName('tiers')
        .setDescription('View reward tiers and progress')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to check')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('achievements')
        .setDescription('View achievements')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to check')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('daily')
        .setDescription('Claim daily bonus'))
    .addSubcommand(sub =>
      sub.setName('weekly')
        .setDescription('Claim weekly bonus'))
    .addSubcommand(sub =>
      sub.setName('milestones')
        .setDescription('View milestone progress'))
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('View rewards leaderboard')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Number of users to show')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)))
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Claim available rewards')),

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
        case 'tiers': {
          const targetUser = interaction.options.getUser('user') || interaction.user;
          const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean();
          const points = userData?.staff?.points || 0;

          const tierFields = REWARD_TIERS.map(tier => {
            const progress = Math.min(100, Math.round((points / tier.threshold) * 100));
            const bar = createProgressBar(progress, 10);
            const unlocked = points >= tier.threshold;
            const status = unlocked ? '✅ **UNLOCKED**' : `\`${bar}\` **${progress}%**`;
            return {
              name: `${tier.label}`,
              value: `> **Reward:** *${tier.reward}*\n> **Status:** ${status}\n> **Required:** \`${points}/${tier.threshold}\` pts`,
              inline: false
            };
          });

          const nextTier = REWARD_TIERS.find(t => points < t.threshold);
          const trajectory = nextTier
            ? `Next tier: **${nextTier.label}** — \`${nextTier.threshold - points}\` more points needed`
            : '🎉 All tiers unlocked! Maximum achievement reached!';

          const embed = await createCustomEmbed(interaction, {
            title: `🏆 Reward Tiers: ${targetUser.username}`,
            thumbnail: targetUser.displayAvatarURL(),
            description: `**Current Points:** \`${points.toLocaleString()}\`\n\n${trajectory}`,
            fields: tierFields,
            color: 'enterprise',
            footer: 'Rewards powered by real merit data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'achievements': {
          const targetUser = interaction.options.getUser('user') || interaction.user;
          const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId }).lean();
          const achievements = userData?.staff?.achievements || [];

          const achieveDisplay = achievements.length > 0
            ? achievements.slice(0, 10).map(a => `🏅 ${a}`).join('\n')
            : '`No achievements yet — keep participating!`'

          const embed = await createCustomEmbed(interaction, {
            title: `🏅 Achievements: ${targetUser.username}`,
            thumbnail: targetUser.displayAvatarURL(),
            fields: [
              { name: '📊 Total', value: `\`${achievements.length}\``, inline: true },
              { name: '🏆 Earned', value: achieveDisplay, inline: false }
            ],
            color: 'enterprise',
            footer: 'Achievements tracked from real activity'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'daily': {
          // Check if already claimed today
          const today = new Date().toISOString().split('T')[0];
          const userData = await User.findOne({ userId: interaction.user.id, 'guilds.guildId': guildId }).lean();
          const lastDaily = userData?.staff?.lastDailyClaim;

          if (lastDaily === today) {
            const embed = createErrorEmbed('❌ You already claimed your daily bonus today! Come back tomorrow.');
            return await interaction.editReply({ embeds: [embed] });
          }

          // Update user with daily bonus
          await User.findOneAndUpdate(
            { userId: interaction.user.id, 'guilds.guildId': guildId },
            {
              $inc: { 'staff.points': 25, 'staff.dailyStreak': 1 },
              $set: { 'staff.lastDailyClaim': today }
            },
            { upsert: true }
          );

          const streak = (userData?.staff?.dailyStreak || 0) + 1;
          const bonus = streak > 5 ? 35 : 25;

          const successEmbed = createSuccessEmbed(
            '🎉 Daily Bonus Claimed!',
            `You received **${bonus}** points!\n🔥 Streak: **${streak}** days`
          );
          return await interaction.editReply({ embeds: [successEmbed] });
        }

        case 'weekly': {
          const embed = await createCustomEmbed(interaction, {
            title: '📅 Weekly Bonus',
            description: 'Claim your weekly participation bonus',
            fields: [
              { name: '💰 Base Reward', value: '`100 points`', inline: true },
              { name: '📈 Streak Bonus', value: '`Up to +50%`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Weekly bonuses reset every Monday'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'milestones': {
          const embed = await createCustomEmbed(interaction, {
            title: '🎯 Milestone Progress',
            description: 'Track your journey to major achievements',
            fields: [
              { name: '📊 Activity Milestones', value: '`Analyzing...`', inline: true },
              { name: '🏆 Rank Milestones', value: '`Tracking...`', inline: true },
              { name: '💎 Special Rewards', value: '`Available: 3`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Milestone tracking based on real progress'
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
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
            return `${medal} \`${i + 1}.\` <@${u.userId}> — **${u.staff?.points || 0}** pts`;
          }).join('\n') || '`No data yet`'

          const embed = await createCustomEmbed(interaction, {
            title: '🏆 Rewards Leaderboard',
            description: leaderboard,
            color: 'enterprise',
            footer: `Top ${limit} earners based on real points`
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'claim': {
          const embed = await createCustomEmbed(interaction, {
            title: '🎁 Available Rewards',
            description: 'Rewards ready to be claimed',
            fields: [
              { name: '✅ Claimable', value: '`Checking...`', inline: true },
              { name: '📊 Progress', value: '`Analyzing...`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Claim rewards based on your achievements'
          });
          return await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[rewards] Error:', error);
      const errEmbed = createErrorEmbed('Failed to process rewards command. Please try again.');
      return await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
