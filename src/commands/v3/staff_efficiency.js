const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_efficiency')
    .setDescription('View staff efficiency metrics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check efficiency for')
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (targetUser) {
      const user = await User.findOne({ userId: targetUser.id });
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

      const staff = user?.staff || {};
      const efficiency = calculateEfficiency(commands, warnings, completedShifts, staff.consistency || 100);

      const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle(`📊 Staff Efficiency - ${targetUser.username}`)
        
        .setThumbnail(targetUser.displayAvatarURL());

      embed.addFields(
        { name: 'Efficiency Score', value: `${efficiency}%`, inline: true },
        { name: 'Consistency', value: `${staff.consistency || 100}%`, inline: true }
      );

      embed.addFields(
        { name: 'Commands', value: commands.toString(), inline: true },
        { name: 'Warnings', value: warnings.toString(), inline: true },
        { name: 'Shifts Completed', value: completedShifts.toString(), inline: true }
      );

      await interaction.reply({ embeds: [embed] });
    } else {
      const users = await User.find({
        'guilds.guildId': guildId,
        staff: { $exists: true }
      }).lean();

      const userEfficiencies = await Promise.all(users.map(async user => {
        const activities = await Activity.find({
          guildId,
          userId: user.userId,
          createdAt: { $gte: thirtyDaysAgo }
        }).lean();

        const shifts = await Shift.find({
          guildId,
          userId: user.userId,
          startTime: { $gte: thirtyDaysAgo }
        }).lean();

        const commands = activities.filter(a => a.type === 'command').length;
        const warnings = activities.filter(a => a.type === 'warning').length;
        const completedShifts = shifts.filter(s => s.endTime).length;

        const efficiency = calculateEfficiency(commands, warnings, completedShifts, user.staff?.consistency || 100);

        return {
          userId: user.userId,
          username: user.username,
          efficiency,
          consistency: user.staff?.consistency || 100,
          commands,
          completedShifts
        };
      }));

      const sortedByEfficiency = userEfficiencies.sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);

      const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle('📊 Staff Efficiency Rankings')
        
        .setDescription('Top 10 most efficient staff members');

      const rankings = sortedByEfficiency.map((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} **${u.username}** - ${u.efficiency}% (${u.commands} cmds, ${u.completedShifts} shifts)`;
      });

      embed.addFields({ name: 'Rankings', value: rankings.join('\n'), inline: false });

      const avgEfficiency = userEfficiencies.length > 0 
        ? Math.round(userEfficiencies.reduce((acc, u) => acc + u.efficiency, 0) / userEfficiencies.length)
        : 0;

      embed.addFields({ name: 'Server Average', value: `${avgEfficiency}%`, inline: true });

      await interaction.reply({ embeds: [embed] });
    }
  }
};

function calculateEfficiency(commands, warnings, completedShifts, consistency) {
  const commandWeight = 2;
  const shiftWeight = 3;
  const warningPenalty = 5;
  const consistencyWeight = 0.3;

  const positiveScore = (commands * commandWeight) + (completedShifts * shiftWeight);
  const penalty = warnings * warningPenalty;
  const consistencyBonus = consistency * consistencyWeight;

  const score = positiveScore - penalty + consistencyBonus;
  return Math.min(100, Math.max(0, Math.round(score / 2)));
}
