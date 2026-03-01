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

      let embedPayload = {
        title: `📅 Trailing Attendance Index`,
        description: `A 30-day tracking analysis aggregated securely for **${interaction.guild.name}**.`,
        fields: []
      };

      if (targetUser) {
        embedPayload.thumbnail = targetUser.displayAvatarURL();
        embedPayload.description += `\nTargeted explicitly against <@${targetUser.id}>.`;
        embedPayload.fields.push({ name: '🔄 Operational Count', value: `\`${totalShifts}\` Patrols`, inline: true });
        embedPayload.fields.push({ name: '✅ Successful Output', value: `\`${completedShifts}\` Pings`, inline: true });
        embedPayload.fields.push({ name: '📈 Retention Trajectory', value: `\`${attendanceRate}%\``, inline: true });
        embedPayload.fields.push({ name: '⏱️ Total Shift Volume', value: `\`${totalHours.toFixed(1)}h\``, inline: true });
      } else {
        embedPayload.thumbnail = interaction.guild.iconURL({ dynamic: true });

        // Map strictly to user indexes
        const userIds = [...new Set(shifts.map(s => s.userId))];

        embedPayload.fields.push({ name: '👥 Active Hierarchy', value: `\`${userIds.length}\` Personnel`, inline: true });
        embedPayload.fields.push({ name: '🔄 Operational Output', value: `\`${totalShifts}\` Pings`, inline: true });
        embedPayload.fields.push({ name: '✅ Retention Success', value: `\`${completedShifts}\` Patrols`, inline: true });
        embedPayload.fields.push({ name: '📈 Trajectory Rate', value: `\`${attendanceRate}%\``, inline: true });
        embedPayload.fields.push({ name: '⏱️ Total Network Yield', value: `\`${totalHours.toFixed(1)}h\``, inline: true });
      }

      const embed = await createCustomEmbed(interaction, embedPayload);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Attendance Summary Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred tracking algorithmic attendance models.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
