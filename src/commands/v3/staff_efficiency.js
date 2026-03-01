const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_efficiency')
    .setDescription('Poll global efficiency matrices mapped strictly inside this server context.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check efficiency for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (targetUser) {
        const user = await User.findOne({ userId: targetUser.id, guildId }).lean();
        if (!user || !user.staff) {
          return interaction.editReply({ embeds: [createErrorEmbed(`No performance logs retrieved. <@${targetUser.id}> isn't mapped inside this server.`)] });
        }

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

        const staff = user.staff || {};
        const efficiency = calculateEfficiency(commands, warnings, completedShifts, staff.consistency || 100);
        const bars = Math.round(efficiency / 10);
        const barChar = '█';
        const emptyChar = '░';
        const visual = `\`${barChar.repeat(bars)}${emptyChar.repeat(10 - bars)}\` **${efficiency}%**`;

        // Elite Grading System
        let grade = 'C';
        if (efficiency >= 95) grade = 'S (Elite)';
        else if (efficiency >= 85) grade = 'A (Superior)';
        else if (efficiency >= 70) grade = 'B (Reliable)';

        const embed = await createCustomEmbed(interaction, {
          title: `📊 Tactical Efficiency: ${targetUser.username}`,
          thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
          description: `### 🛡️ Personnel Yield Audit\nReviewing 30-day authenticated activity tracked inside sector **${interaction.guild.name}**. Cross-referencing behavioral consistency with output yields.`,
          fields: [
            { name: '🔋 Efficiency Gradient', value: `${visual}\n> **Performance Grade:** \`Rank [${grade}]\``, inline: false },
            { name: '📊 Operational Integrity', value: `\`${staff.consistency || 100}%\``, inline: true },
            { name: '✅ Network Commands', value: `\`${commands}\` Pings`, inline: true },
            { name: '⚠️ Moderation Disputes', value: `\`${warnings}\` Incidents`, inline: true },
            { name: '🔄 Retention Yield', value: `\`${completedShifts}\` Patrols`, inline: true },
            { name: '✨ Level Clearance', value: `\`LVL ${staff.level || 1}\``, inline: true }
          ],
          footer: 'Predictive Efficiency Modeling • V3 Strategic',
          color: efficiency >= 80 ? 'success' : 'premium'
        });

        await interaction.editReply({ embeds: [embed] });

      } else {
        // Calculate Global Tier List limited by Guild bounds
        const users = await User.find({
          guildId,
          staff: { $exists: true }
        }).lean();

        if (!users.length) {
          return interaction.editReply({ embeds: [createErrorEmbed('No staff database queries detected mapped securely to this operational bounds.')] });
        }

        const userEfficiencies = await Promise.all(users.map(async user => {
          const activitiesBuffer = await Activity.find({
            guildId,
            userId: user.userId,
            createdAt: { $gte: thirtyDaysAgo }
          }).lean();

          const shiftsBuffer = await Shift.find({
            guildId,
            userId: user.userId,
            startTime: { $gte: thirtyDaysAgo }
          }).lean();

          const commands = activitiesBuffer.filter(a => a.type === 'command').length;
          const warnings = activitiesBuffer.filter(a => a.type === 'warning').length;
          const completedShifts = shiftsBuffer.filter(s => s.endTime).length;

          const efficiency = calculateEfficiency(commands, warnings, completedShifts, user.staff?.consistency || 100);

          return {
            userId: user.userId,
            username: user.username,
            efficiency,
            commands,
            completedShifts
          };
        }));

        const sortedByEfficiency = userEfficiencies.sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);

        let rankStrings = sortedByEfficiency.map((u, i) => {
          const medal = i === 0 ? '👑' : i === 1 ? '🥇' : i === 2 ? '🥈' : `\`${i + 1}\``;
          return `${medal} <@${u.userId}> : **${u.efficiency}%** | \`${u.commands} Cmd | ${u.completedShifts} Pld\``;
        });

        const avgEfficiency = userEfficiencies.length > 0
          ? Math.round(userEfficiencies.reduce((acc, u) => acc + u.efficiency, 0) / userEfficiencies.length)
          : 0;

        const embed = await createCustomEmbed(interaction, {
          title: '📊 Operational Server Efficiency Toplist',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: `### 🛡️ Authorized Personnel Ranking\nFiltering the top 10 most technically efficient tracked responders in the **${interaction.guild.name}** sector.`,
          fields: [
            { name: '🏆 Model Operatives', value: rankStrings.join('\n') || '*No authenticated entries resolved.*', inline: false },
            { name: '🌐 Sector Baseline', value: `\`Relative Efficient Threshold: ${avgEfficiency}%\``, inline: false }
          ],
          footer: 'Rankings authenticated against 30-day tracking vector • V3 Strategic',
          color: 'enterprise'
        });

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Staff Efficiency Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Efficiency Matrix failure: Unable to decode server-wide performance comparisons.')] });
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
