const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_optimizer')
    .setDescription('Algorithmic patrol mapping to detect efficiency drop-offs in server management.')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Trailing analysis period')
        .setRequired(false)
        .addChoices(
          { name: 'Trailing 7 Days', value: '7' },
          { name: 'Trailing 14 Days', value: '14' },
          { name: 'Trailing 30 Days', value: '30' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const period = parseInt(interaction.options.getString('period') || '14');

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - period);

      const shifts = await Shift.find({
        guildId,
        startTime: { $gte: daysAgo }
      }).lean();

      if (shifts.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No shift patrol data exists inside this server to evaluate against a \`${period}\`-day vector.`)] });
      }

      const userShiftCounts = {};
      shifts.forEach(s => {
        if (!userShiftCounts[s.userId]) {
          userShiftCounts[s.userId] = { total: 0, completed: 0, hours: 0 };
        }
        userShiftCounts[s.userId].total++;
        if (s.endTime) {
          userShiftCounts[s.userId].completed++;
          userShiftCounts[s.userId].hours += (s.duration || 0) / 3600;
        }
      });

      // Filter algorithm securely bounding users via internal array map indexing
      const users = await User.find({
        guildId,
        staff: { $exists: true }
      }).lean();

      if (users.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No active operators exist globally mapping to your server permissions boundaries.`)] });
      }

      const staffData = users.map(u => {
        const shiftData = userShiftCounts[u.userId] || { total: 0, completed: 0, hours: 0 };
        return {
          userId: u.userId,
          username: u.username,
          rank: u.staff?.rank || 'member',
          points: u.staff?.points || 0,
          consistency: u.staff?.consistency || 100,
          ...shiftData
        };
      }).sort((a, b) => b.points - a.points);

      const totalShifts = shifts.length;
      const completedShifts = shifts.filter(s => s.endTime).length;
      const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const avgShiftsPerUser = staffData.length > 0 ? (totalShifts / staffData.length).toFixed(1) : 0;
      const completionRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: '📅 Network Patrol Optimizer',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `Reviewing execution metrics gathered across the trailing **${period} Day** span.`,
        fields: [
          { name: '🌐 Total Trace Yield', value: `\`${totalShifts}\` Pings`, inline: true },
          { name: '✅ Authorized Patrols', value: `\`${completedShifts}\` Retained`, inline: true },
          { name: '📈 Retention Trajectory', value: `\`${completionRate}%\``, inline: true },
          { name: '⏱️ Total Shift Volume', value: `\`${totalHours.toFixed(1)}h\``, inline: true },
          { name: '👥 Network Node Density', value: `\`${avgShiftsPerUser}\` Avg Shifts`, inline: true }
        ]
      });

      const underperforming = staffData.filter(s => s.total < period / 3);
      const overperforming = staffData.filter(s => s.total >= period / 2);

      if (underperforming.length > 0) {
        const underperformers = underperforming.slice(0, 5).map(s => `<@${s.userId}> ➔ \`${s.total}\` Deployments`);
        embed.addFields({ name: '⚠️ Decay Flagged Operators', value: underperformers.join('\n'), inline: false });
      }

      if (overperforming.length > 0) {
        const topPerformers = overperforming.slice(0, 5).map(s => `<@${s.userId}> ➔ \`${s.total}\` Deployments (\`${s.hours.toFixed(1)}h\`)`);
        embed.addFields({ name: '⭐ Model Operative Vectors', value: topPerformers.join('\n'), inline: false });
      }

      const suggestions = generateSuggestions(staffData, period);
      embed.addFields({ name: '🔧 Backend Algorithmic Insight', value: suggestions, inline: false });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Shift Optimizer Error:', error);
      const errEmbed = createErrorEmbed('A backend tracking error occurred resolving shift optimizer projections.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

function generateSuggestions(staffData, period) {
  const suggestions = [];
  const targetShifts = Math.ceil(period / 3);

  const inactive = staffData.filter(s => s.total === 0);
  if (inactive.length > 0) {
    suggestions.push(`> **${inactive.length} Operators** yielded *zero* patrol interactions across this query window.\n> Consider evaluating active status limits.`);
  }

  const overloaded = staffData.filter(s => s.total > targetShifts * 1.5);
  if (overloaded.length > 0) {
    const list = overloaded.slice(0, 3).map(s => `<@${s.userId}>`).join(', ');
    suggestions.push(`> **Model Decay Vulnerability:** ${list} are exceeding expected bounds. Distribute payload balance.`);
  }

  const underperforming = staffData.filter(s => s.total < targetShifts && s.total > 0);
  if (underperforming.length > 0) {
    const list = underperforming.slice(0, 3).map(s => `<@${s.userId}>`).join(', ');
    suggestions.push(`> Review patrol schedules targeting ${list} to increase network retention coverage limits.`);
  }

  return suggestions.length > 0 ? suggestions.join('\n\n') : '*All algorithm tracks are behaving optimally.*';
}
