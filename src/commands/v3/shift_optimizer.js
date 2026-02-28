const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_optimizer')
    .setDescription('Optimize shift scheduling')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period to analyze')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: '7' },
          { name: '14 Days', value: '14' },
          { name: '30 Days', value: '30' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const period = parseInt(interaction.options.getString('period') || '14');

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    const shifts = await Shift.find({
      guildId,
      startTime: { $gte: daysAgo }
    }).lean();

    const userShiftCounts = {};
    shifts.forEach(s => {
      if (!userShiftCounts[s.userId]) {
        userShiftCounts[s.userId] = { total: 0, completed: 0, hours: 0 };
      }
      userShiftCounts[s.userId].total++;
      if (s.endTime) {
        userShiftCounts[s.userId].completed++;
        userShiftCounts[s.userId].hours += (s.duration || 0) / 60;
      }
    });

    const users = await User.find({
      'guilds.guildId': guildId,
      staff: { $exists: true }
    }).lean();

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
    const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const avgShiftsPerUser = staffData.length > 0 ? (totalShifts / staffData.length).toFixed(1) : 0;
    const completionRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

    const embed = createPremiumEmbed()
      .setTitle('📅 Shift Optimizer')
      
      .setDescription(`Shift analysis for the last ${period} days`);

    embed.addFields(
      { name: 'Total Shifts', value: totalShifts.toString(), inline: true },
      { name: 'Completed', value: completedShifts.toString(), inline: true },
      { name: 'Completion Rate', value: `${completionRate}%`, inline: true },
      { name: 'Total Hours', value: totalHours.toFixed(1), inline: true },
      { name: 'Avg Shifts/User', value: avgShiftsPerUser.toString(), inline: true }
    );

    const underperforming = staffData.filter(s => s.total < period / 3);
    const overperforming = staffData.filter(s => s.total >= period / 2);

    if (underperforming.length > 0) {
      const underperformers = underperforming.slice(0, 5).map(s => `${s.username}: ${s.total} shifts`);
      embed.addFields({ name: '⚠️ Underperforming', value: underperformers.join('\n'), inline: false });
    }

    if (overperforming.length > 0) {
      const topPerformers = overperforming.slice(0, 5).map(s => `${s.username}: ${s.total} shifts (${s.hours.toFixed(1)}h)`);
      embed.addFields({ name: '⭐ Top Performers', value: topPerformers.join('\n'), inline: false });
    }

    const suggestions = generateSuggestions(staffData, period);
    embed.addFields({ name: '💡 Suggestions', value: suggestions, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};

function generateSuggestions(staffData, period) {
  const suggestions = [];
  const targetShifts = Math.ceil(period / 3);

  const underperforming = staffData.filter(s => s.total < targetShifts && s.total > 0);
  if (underperforming.length > 0) {
    suggestions.push(`Consider scheduling more shifts for: ${underperforming.slice(0, 3).map(s => s.username).join(', ')}`);
  }

  const inactive = staffData.filter(s => s.total === 0);
  if (inactive.length > 0) {
    suggestions.push(`${inactive.length} staff members have no shifts - check in with them`);
  }

  const overloaded = staffData.filter(s => s.total > targetShifts * 1.5);
  if (overloaded.length > 0) {
    suggestions.push(`Consider redistributing shifts from: ${overloaded.slice(0, 3).map(s => s.username).join(', ')}`);
  }

  return suggestions.length > 0 ? suggestions.join('\n') : 'No major issues found';
}



