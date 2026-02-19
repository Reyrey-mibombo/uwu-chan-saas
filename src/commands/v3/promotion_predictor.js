const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predictor')
    .setDescription('Predict promotions based on performance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to predict promotion for')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
      await user.save();
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await Activity.find({
      guildId,
      userId: targetUser.id,
      createdAt: { $gte: thirtyDaysAgo }
    }).lean();

    const shifts = await Shift.find({
      guildId,
      userId: targetUser.id,
      startTime: { $gte: thirtyDaysAgo }
    }).lean();

    const staff = user.staff || {};
    const points = staff.points || 0;
    const consistency = staff.consistency || 100;
    const reputation = staff.reputation || 0;
    const rank = staff.rank || 'member';

    const commands = activities.filter(a => a.type === 'command').length;
    const completedShifts = shifts.filter(s => s.endTime).length;

    const promotionScore = calculatePromotionScore(points, consistency, reputation, commands, completedShifts, rank);
    const prediction = getPrediction(promotionScore, rank);

    const embed = new EmbedBuilder()
      .setTitle(`🔮 Promotion Predictor - ${targetUser.username}`)
      .setColor(prediction.color)
      .setThumbnail(targetUser.displayAvatarURL());

    embed.addFields(
      { name: 'Current Rank', value: rank.charAt(0).toUpperCase() + rank.slice(1), inline: true },
      { name: 'Promotion Score', value: `${promotionScore}/100`, inline: true },
      { name: 'Prediction', value: prediction.text, inline: false }
    );

    embed.addFields(
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Consistency', value: `${consistency}%`, inline: true },
      { name: 'Reputation', value: reputation.toString(), inline: true }
    );

    embed.addFields(
      { name: 'Commands (30d)', value: commands.toString(), inline: true },
      { name: 'Completed Shifts', value: completedShifts.toString(), inline: true }
    );

    const requirements = getNextRankRequirements(rank);
    if (requirements) {
      embed.addFields({ name: 'Next Rank Requirements', value: requirements, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};

function calculatePromotionScore(points, consistency, reputation, commands, completedShifts, rank) {
  const pointsScore = Math.min(30, (points / 100) * 30);
  const consistencyScore = (consistency / 100) * 20;
  const reputationScore = Math.min(15, reputation / 10);
  const activityScore = Math.min(20, commands * 0.5) + Math.min(15, completedShifts * 2);

  const rankMultiplier = rank === 'member' ? 1.2 : rank === 'trial' ? 1.1 : rank === 'senior' ? 0.8 : 0.5;

  return Math.round(Math.min(100, (pointsScore + consistencyScore + reputationScore + activityScore) * rankMultiplier));
}

function getPrediction(score, rank) {
  const nextRanks = {
    member: 'trial',
    trial: 'regular',
    regular: 'senior',
    senior: 'lead',
    lead: 'manager'
  };

  if (score >= 80) {
    return { text: 'Eligible for promotion! 🎉', color: 0x2ecc71 };
  } else if (score >= 60) {
    const nextRank = nextRanks[rank] || rank;
    return { text: `Almost there! ~${Math.ceil((80 - score) / 5)} weeks to ${nextRank}`, color: 0xf1c40f };
  } else if (score >= 40) {
    return { text: 'Keep improving to reach next rank', color: 0xe67e22 };
  }
  return { text: 'Needs more activity for promotion', color: 0xe74c3c };
}

function getNextRankRequirements(rank) {
  const requirements = {
    member: '🎯 50 points + 80% consistency + 5 completed shifts',
    trial: '🎯 100 points + 85% consistency + 10 completed shifts',
    regular: '🎯 200 points + 90% consistency + 20 completed shifts + 15 reputation',
    senior: '🎯 400 points + 95% consistency + 30 completed shifts + 30 reputation',
    lead: '🎯 600 points + 95% consistency + 50 completed shifts + 50 reputation'
  };
  return requirements[rank] || null;
}
