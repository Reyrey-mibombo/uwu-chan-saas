const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_summary')
    .setDescription('Zenith Apex: Macroscopic Attendance Heatmaps & Density Mapping'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');
      const query = { guildId };
      if (targetUser) query.userId = targetUser.id;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const shifts = await Shift.find({
        ...query,
        startTime: { $gte: sevenDaysAgo }
      }).lean();

      // 1. Generate Presence Heatmap (7 Days)
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const heatmap = new Array(7).fill(0);

      shifts.forEach(s => {
        const day = new Date(s.startTime).getUTCDay();
        heatmap[day]++;
      });

      const maxDensity = Math.max(...heatmap, 1);
      const heatmapViz = heatmap.map((count, i) => {
        const intensity = '░▒▓█'[Math.min(3, Math.floor((count / maxDensity) * 3))];
        return `\`${dayLabels[i]}\` ${intensity.repeat(5)} \`[${count}]\``;
      }).join('\n');

      const totalShifts = shifts.length;
      const completedShifts = shifts.filter(s => s.endTime).length;
      const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: targetUser ? `📅 Zenith Attendance Matrix: ${targetUser.username}` : '📅 Sector Workforce Density',
        thumbnail: targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Presence Mapping\nAutomated 7-day density analysis aggregated from operational personnel footprints. Visualizing sector metabolism.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '📊 7-Day Activity Heatmap', value: heatmapViz, inline: false },
          { name: '🔄 Operational Yield', value: `\`${totalShifts}\` Pings`, inline: true },
          { name: '✅ Retention Success', value: `\`${completedShifts}\` Retained`, inline: true },
          { name: '📈 Trajectory', value: `\`${attendanceRate}%\``, inline: true },
          { name: '⚖️ Sector Health', value: attendanceRate >= 80 ? '`STABLE`' : '`DEGRADED`', inline: true }
        ],
        footer: 'Presence Density Visualization • V3 Strategic Apex Suite',
        color: attendanceRate >= 80 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Attendance Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Presence Analytics failure: Unable to decode metabolic heatmaps.')] });
    }
  }
};
