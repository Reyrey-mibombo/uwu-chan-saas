const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_summary')
    .setDescription('Trailing algorithmic attendance analysis matrix.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Target specific user explicitly')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      // Dynamic search vector maps target constraints locally to prevent leaking
      const query = { guildId };
      if (targetUser) query.userId = targetUser.id;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const shifts = await Shift.find({
        ...query,
        startTime: { $gte: thirtyDaysAgo }
      }).lean();

      if (shifts.length === 0) {
        if (targetUser) return interaction.editReply({ embeds: [createErrorEmbed(`No attendance footprint mapped for <@${targetUser.id}> inside this server over the last 30 days.`)] });
        return interaction.editReply({ embeds: [createErrorEmbed('No attendance vectors recorded globally in this server boundary over the last month.')] });
      }

      const totalShifts = shifts.length;
      const completedShifts = shifts.filter(s => s.endTime).length;
      const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;
      const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const embedPayload = {
        title: targetUser ? `📅 Attendance Index: ${targetUser.username}` : '📅 Sector Retention Index',
        thumbnail: targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Network Stability Report: ${interaction.guild.name}\nAutomated 30-day tracking analysis aggregated securely from operational patrol telemetry.`,
        fields: [],
        footer: 'Predictive Attendance Modeling • V3 Strategic Suite',
        color: attendanceRate >= 80 ? 'success' : 'premium'
      };

      if (targetUser) {
        embedPayload.fields.push(
          { name: '🔄 Operational Count', value: `\`${totalShifts}\` Patrols`, inline: true },
          { name: '✅ Retention Success', value: `\`${completedShifts}\` Retained`, inline: true },
          { name: '📈 Trajectory', value: `\`${attendanceRate}%\``, inline: true },
          { name: '⏱️ Man-Hours', value: `\`${totalHours.toFixed(1)}h\``, inline: true },
          { name: '⚖️ Reliability', value: attendanceRate >= 90 ? '`Optimal`' : '`Standard`', inline: true }
        );
      } else {
        const userIds = [...new Set(shifts.map(s => s.userId))];
        embedPayload.fields.push(
          { name: '👥 Network Density', value: `\`${userIds.length}\` Personnel`, inline: true },
          { name: '🔄 Operational Output', value: `\`${totalShifts}\` Pings`, inline: true },
          { name: '✅ Retention Yield', value: `\`${completedShifts}\` Patrols`, inline: true },
          { name: '📈 Sector Health', value: `\`${attendanceRate}%\``, inline: true },
          { name: '⏱️ Aggregate Hours', value: `\`${totalHours.toFixed(1)}h\``, inline: true }
        );
      }

      const embed = await createCustomEmbed(interaction, embedPayload);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Attendance Summary Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Retention Analytics failure: Unable to decode attendance telemetry.')] });
    }
  }
};
