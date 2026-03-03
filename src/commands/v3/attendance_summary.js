const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Shift } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance_summary')
    .setDescription('Enterprise Apex: Macroscopic Attendance Heatmaps & Density Mapping'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Enterprise License Guard
      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
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
        const intensity = '����'[Math.min(3, Math.floor((count / maxDensity) * 3))];
        return `\`${dayLabels[i]}\` ${intensity.repeat(5)} \`[${count}]\``;
      }).join('\n');

      const totalShifts = shifts.length;
      const completedShifts = shifts.filter(s => s.endTime).length;
      const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: targetUser ? `?? Enterprise Attendance Matrix: ${targetUser.username}` : '?? Sector Workforce Density',
        thumbnail: targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : interaction.guild.iconURL({ dynamic: true }),
        description: `### ??? Macroscopic Presence Mapping\nAutomated 7-day density analysis aggregated from operational personnel footprints. Visualizing sector metabolism.\n\n**?? Enterprise APEX EXCLUSIVE**`,
        fields: [
          { name: '?? 7-Day Activity Heatmap', value: heatmapViz, inline: false },
          { name: '?? Operational Yield', value: `\`${totalShifts}\` Pings`, inline: true },
          { name: '? Retention Success', value: `\`${completedShifts}\` Retained`, inline: true },
          { name: '?? Trajectory', value: `\`${attendanceRate}%\``, inline: true },
          { name: '?? Sector Health', value: attendanceRate >= 80 ? '`STABLE`' : '`DEGRADED`', inline: true }
        ],
        footer: 'Presence Density Visualization � V3 Strategic Apex Suite',
        color: attendanceRate >= 80 ? 'success' : 'premium'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_attendance_summary').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Enterprise Attendance Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_attendance_summary').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Presence Analytics failure: Unable to decode metabolic heatmaps.')], components: [row] });
    }
  }
};


