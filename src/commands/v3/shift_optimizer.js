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
        title: '📊 Workforce Optimization Matrix',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Operational Analytics: Sector ${interaction.guild.name}\nMacroscopic evaluation of workforce execution gathered over a **${period}-day** trajectory. Analysis based on real-time patrol telemetry.`,
        fields: [
          { name: '🌐 Total Trace Yield', value: `\`${totalShifts}\` Pings`, inline: true },
          { name: '✅ Authorized Patrols', value: `\`${completedShifts}\` Retained`, inline: true },
          { name: '📈 Retention Rate', value: `\`${completionRate}%\``, inline: true },
          { name: '⏱️ Man-Hours Logged', value: `\`${totalHours.toFixed(1)}h\``, inline: true },
          { name: '👥 Node Density', value: `\`${avgShiftsPerUser}\` Avg Shifts`, inline: true },
          { name: '🏢 Sector Health', value: completionRate >= 80 ? '`Optimal`' : '`Degraded`', inline: true }
        ],
        footer: 'Algorithmic Workforce Projection • V3 Strategic Suite',
        color: completionRate >= 80 ? 'success' : 'premium'
      });

      const underperforming = staffData.filter(s => s.total < period / 4);
      const overperforming = staffData.filter(s => s.total >= period / 2);

      if (underperforming.length > 0) {
        const list = underperforming.slice(0, 5).map(s => `🔴 <@${s.userId}> : \`${s.total}\` Deployments`).join('\n');
        embed.addFields({ name: '⚠️ Operational Decay Flagged', value: list, inline: false });
      }

      if (overperforming.length > 0) {
        const list = overperforming.slice(0, 5).map(s => `🔵 <@${s.userId}> : \`${s.total}\` Deployments (${s.hours.toFixed(1)}h)`).join('\n');
        embed.addFields({ name: '⭐ Model Operative Vectors', value: list, inline: false });
      }

      const suggestions = generateSuggestions(staffData, period);
      embed.addFields({ name: '🔧 Strategic Intelligence Output', value: `> ${suggestions}`, inline: false });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Shift Optimizer Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Strategic Intelligence Module failure: Unable to resolve shift projections.')] });
    }
  }
};

function generateSuggestions(staffData, period) {
  const suggestions = [];
  const targetShifts = Math.ceil(period / 3);

  const inactive = staffData.filter(s => s.total === 0);
  if (inactive.length > 0) suggestions.push(`**Personnel Risk:** ${inactive.length} operators show zero operational footprint. Recommend status audit.`);

  const overloaded = staffData.filter(s => s.total > targetShifts * 2);
  if (overloaded.length > 0) suggestions.push('**Sustainability Alert:** High density observed in core team. Recommend payload redistribution.');

  const underperf = staffData.filter(s => s.total < targetShifts && s.total > 0);
  if (underperf.length > 0) suggestions.push('**Growth Potential:** Trailing performance in mid-tier nodes. Target scheduling optimization.');

  return suggestions.length > 0 ? suggestions.join('\n\n') : 'All operational vectors are behaving within optimal bounds.';
}
