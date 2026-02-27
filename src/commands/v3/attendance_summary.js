const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_summary')
    .setDescription('View attendance summary')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check attendance for')
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');
    const query = { guildId };
    if (targetUser) query.userId = targetUser.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const shifts = await Shift.find({
      ...query,
      startTime: { $gte: thirtyDaysAgo }
    }).lean();

    const totalShifts = shifts.length;
    const completedShifts = shifts.filter(s => s.endTime).length;
    const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

    const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const userIds = [...new Set(shifts.map(s => s.userId))];
    const userAttendance = {};
    for (const userId of userIds) {
      const userShifts = shifts.filter(s => s.userId === userId);
      userAttendance[userId] = {
        total: userShifts.length,
        completed: userShifts.filter(s => s.endTime).length,
        hours: userShifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60
      };
    }

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📅 Attendance Summary')
      
      .setDescription(`Attendance for the last 30 days`);

    if (targetUser) {
      const userShifts = await Shift.find({
        guildId,
        userId: targetUser.id,
        startTime: { $gte: thirtyDaysAgo }
      }).lean();

      const userTotal = userShifts.length;
      const userCompleted = userShifts.filter(s => s.endTime).length;
      const userRate = userTotal > 0 ? Math.round((userCompleted / userTotal) * 100) : 0;
      const userHours = userShifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

      embed.setThumbnail(targetUser.displayAvatarURL());
      embed.addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Total Shifts', value: userTotal.toString(), inline: true },
        { name: 'Completed', value: userCompleted.toString(), inline: true },
        { name: 'Attendance Rate', value: `${userRate}%`, inline: true },
        { name: 'Total Hours', value: userHours.toFixed(1), inline: true }
      );
    } else {
      embed.addFields(
        { name: 'Total Staff', value: userIds.length.toString(), inline: true },
        { name: 'Total Shifts', value: totalShifts.toString(), inline: true },
        { name: 'Completed', value: completedShifts.toString(), inline: true },
        { name: 'Attendance Rate', value: `${attendanceRate}%`, inline: true },
        { name: 'Total Hours', value: totalHours.toFixed(1), inline: true }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
