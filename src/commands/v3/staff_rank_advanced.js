const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank_advanced')
    .setDescription('Advanced staff rank view')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check rank for')
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
      await user.save();
    }

    const users = await User.find({
      'guilds.guildId': guildId,
      staff: { $exists: true }
    }).lean();

    const sortedByPoints = [...users].sort((a, b) => (b.staff?.points || 0) - (a.staff?.points || 0));
    const rankIndex = sortedByPoints.findIndex(u => u.userId === targetUser.id);
    const rank = rankIndex + 1;

    const staff = user.staff || {};
    const currentRank = staff.rank || 'member';
    const points = staff.points || 0;
    const consistency = staff.consistency || 100;
    const reputation = staff.reputation || 0;
    const warnings = staff.warnings || 0;

    const rankHierarchy = ['member', 'trial', 'regular', 'senior', 'lead', 'manager', 'admin'];
    const currentRankIndex = rankHierarchy.indexOf(currentRank);
    const nextRank = rankHierarchy[currentRankIndex + 1];

    const pointsForNextRank = getPointsForRank(nextRank);
    const pointsToNext = pointsForNextRank ? pointsForNextRank - points : 0;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`📈 Staff Rank - ${targetUser.username}`)
      )
      .setThumbnail(targetUser.displayAvatarURL());

    embed.addFields(
      { name: 'Current Rank', value: formatRank(currentRank), inline: true },
      { name: 'Global Rank', value: `#${rank}/${users.length}`, inline: true }
    );

    if (nextRank) {
      embed.addFields(
        { name: 'Next Rank', value: formatRank(nextRank), inline: true },
        { name: 'Points Needed', value: pointsToNext.toString(), inline: true }
      );
    }

    embed.addFields(
      { name: 'Total Points', value: points.toString(), inline: true },
      { name: 'Consistency', value: `${consistency}%`, inline: true },
      { name: 'Reputation', value: reputation.toString(), inline: true },
      { name: 'Warnings', value: warnings.toString(), inline: true }
    );

    const progress = generateRankProgress(points, currentRankIndex);
    embed.addFields({ name: 'Rank Progress', value: progress, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};

function getPointsForRank(rank) {
  const thresholds = {
    member: 0,
    trial: 50,
    regular: 150,
    senior: 350,
    lead: 600,
    manager: 1000,
    admin: 2000
  };
  return thresholds[rank] || 0;
}

function formatRank(rank) {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

function getRankColor(rank) {
  const colors = {
    member: 0x95a5a6,
    trial: 0x3498db,
    regular: 0x2ecc71,
    senior: 0x9b59b6,
    lead: 0xf1c40f,
    manager: 0xe67e22,
    admin: 0xe74c3c
  };
  return colors[rank] || 0x95a5a6;
}

function generateRankProgress(points, currentRankIndex) {
  const thresholds = [0, 50, 150, 350, 600, 1000, 2000];
  const currentThreshold = thresholds[currentRankIndex] || 0;
  const nextThreshold = thresholds[currentRankIndex + 1] || thresholds[thresholds.length - 1];
  
  const progress = nextThreshold > currentThreshold 
    ? Math.min(20, Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 20))
    : 20;

  let bar = '';
  for (let i = 0; i < 20; i++) {
    bar += i < progress ? '🟦' : '⬜';
  }

  return `${bar} ${points}/${nextThreshold}`;
}
