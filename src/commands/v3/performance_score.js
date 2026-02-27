const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_score')
    .setDescription('View performance analytics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check performance for')
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

    const commands = activities.filter(a => a.type === 'command').length;
    const warnings = activities.filter(a => a.type === 'warning').length;
    const completedShifts = shifts.filter(s => s.endTime).length;
    const totalShifts = shifts.length;

    const shiftCompletionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;
    const consistency = user.staff?.consistency || 100;
    const points = user.staff?.points || 0;
    const reputation = user.staff?.reputation || 0;

    const performanceScore = calculatePerformanceScore(
      commands,
      warnings,
      shiftCompletionRate,
      consistency,
      reputation
    );

    const grade = getGrade(performanceScore);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`📊 Performance Score - ${targetUser.username}`)
      )
      .setThumbnail(targetUser.displayAvatarURL());

    embed.addFields(
      { name: 'Score', value: `${performanceScore}/100`, inline: true },
      { name: 'Grade', value: grade, inline: true }
    );

    embed.addFields(
      { name: 'Commands (30d)', value: commands.toString(), inline: true },
      { name: 'Warnings', value: warnings.toString(), inline: true },
      { name: 'Shift Completion', value: `${Math.round(shiftCompletionRate)}%`, inline: true }
    );

    embed.addFields(
      { name: 'Consistency', value: `${consistency}%`, inline: true },
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Reputation', value: reputation.toString(), inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};

function calculatePerformanceScore(commands, warnings, shiftCompletion, consistency, reputation) {
  const commandScore = Math.min(30, commands * 2);
  const warningScore = Math.max(0, 20 - warnings * 5);
  const shiftScore = (shiftCompletion / 100) * 25;
  const consistencyScore = (consistency / 100) * 15;
  const reputationScore = Math.min(10, reputation / 10);

  return Math.round(commandScore + warningScore + shiftScore + consistencyScore + reputationScore);
}

function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getGradeColor(grade) {
  if (grade.startsWith('A')) return 0x2ecc71;
  if (grade.startsWith('B')) return 0x3498db;
  if (grade === 'C') return 0xf1c40f;
  if (grade === 'D') return 0xe67e22;
  return 0xe74c3c;
}
