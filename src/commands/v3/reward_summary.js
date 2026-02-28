const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_summary')
    .setDescription('View reward summary')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view rewards for')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
      await user.save();
    }

    const staff = user.staff || {};
    const points = staff.points || 0;
    const reputation = staff.reputation || 0;
    const achievements = staff.achievements || [];

    const tierInfo = getTierInfo(points);
    const rewards = getAvailableRewards(tierInfo.tier);

    const embed = createPremiumEmbed()
      .setTitle(`🎁 Reward Summary - ${targetUser.username}`)
      
      .setThumbnail(targetUser.displayAvatarURL());

    embed.addFields(
      { name: 'Current Tier', value: tierInfo.tier, inline: true },
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Next Tier', value: tierInfo.nextTier, inline: true },
      { name: 'Points to Next', value: tierInfo.pointsToNext.toString(), inline: true }
    );

    embed.addFields(
      { name: 'Reputation', value: reputation.toString(), inline: true },
      { name: 'Achievements', value: achievements.length.toString(), inline: true }
    );

    const rewardList = rewards.map(r => `${r.icon} **${r.name}** - ${r.cost} pts`);
    embed.addFields({ name: 'Available Rewards', value: rewardList.join('\n') || 'No rewards available', inline: false });

    const progress = generateProgressBar(points, tierInfo.nextTierPoints);
    embed.addFields({ name: 'Progress to Next Tier', value: progress, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};

function getTierInfo(points) {
  const tiers = [
    { name: 'Bronze', min: 0, color: 0xcd7f32 },
    { name: 'Silver', min: 500, color: 0xc0c0c0 },
    { name: 'Gold', min: 1500, color: 0xffd700 },
    { name: 'Platinum', min: 3000, color: 0xe5e4e2 },
    { name: 'Diamond', min: 5000, color: 0xb9f2ff }
  ];

  let currentTier = tiers[0];
  let nextTier = null;
  let pointsToNext = 0;

  for (const tier of tiers) {
    if (points >= tier.min) {
      currentTier = tier;
      const nextIndex = tiers.indexOf(tier) + 1;
      if (nextIndex < tiers.length) {
        nextTier = tiers[nextIndex];
        pointsToNext = nextTier.min - points;
      }
    }
  }

  return {
    tier: currentTier.name,
    color: currentTier.color,
    nextTier: nextTier ? nextTier.name : 'Max',
    nextTierPoints: nextTier ? nextTier.min : points,
    pointsToNext
  };
}

function getAvailableRewards(tier) {
  const allRewards = [
    { name: 'Custom Role', cost: 200, icon: '🎭', tier: 'Bronze' },
    { name: 'Profile Badge', cost: 300, icon: '🏅', tier: 'Bronze' },
    { name: 'Priority Queue', cost: 400, icon: '⏩', tier: 'Silver' },
    { name: 'Name Color', cost: 500, icon: '🎨', tier: 'Silver' },
    { name: 'Exclusive Channel', cost: 800, icon: '💬', tier: 'Gold' },
    { name: 'VIP Badge', cost: 1000, icon: '✨', tier: 'Gold' },
    { name: 'Event Host', cost: 1500, icon: '🎪', tier: 'Platinum' },
    { name: 'Server Boost', cost: 2000, icon: '🚀', tier: 'Diamond' }
  ];

  const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const userTierIndex = tierOrder.indexOf(tier);

  return allRewards.filter(r => tierOrder.indexOf(r.tier) <= userTierIndex);
}

function generateProgressBar(points, nextTierPoints) {
  const total = 20;
  const progress = nextTierPoints > 0 ? Math.min(total, Math.round((points / nextTierPoints) * total)) : total;
  
  let bar = '';
  for (let i = 0; i < total; i++) {
    bar += i < progress ? '🟩' : '⬜';
  }
  
  return `${bar} ${points}/${nextTierPoints}`;
}



