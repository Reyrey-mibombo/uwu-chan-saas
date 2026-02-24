const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

function progressBar(value, max, len = 10) {
  const filled = Math.round((value / Math.max(max, 1)) * len);
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_insights')
    .setDescription('Get detailed activity insights for this server'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 No activity data found for the past 7 days.');
    }

    // Group by hour
    const hourCounts = Array(24).fill(0);
    // Group by day name
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayCounts = Array(7).fill(0);

    activities.forEach(a => {
      const d = new Date(a.createdAt);
      hourCounts[d.getHours()]++;
      dayCounts[d.getDay()]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
    const totalActivity = activities.length;
    const avgPerDay = (totalActivity / 7).toFixed(1);

    // Top 3 hours
    const topHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topHoursText = topHours.map(h => `\`${String(h.hour).padStart(2,'0')}:00\` — ${h.count} actions`).join('\n');

    // Day breakdown
    const dayBreakdown = dayNames.map((name, i) => {
      const bar = progressBar(dayCounts[i], Math.max(...dayCounts), 8);
      return `${name.slice(0,3)}: ${bar} ${dayCounts[i]}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🔍 Activity Insights — Last 7 Days')
      .setColor(0x3498db)
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '📊 Total Activity', value: totalActivity.toString(), inline: true },
        { name: '📅 Daily Average', value: avgPerDay, inline: true },
        { name: '⏰ Peak Hour', value: `${String(peakHour).padStart(2,'0')}:00`, inline: true },
        { name: '📆 Most Active Day', value: dayNames[peakDay], inline: true },
        { name: '🔝 Unique Users', value: [...new Set(activities.map(a => a.userId))].length.toString(), inline: true },
        { name: '⚡ Commands Run', value: activities.filter(a => a.type === 'command').length.toString(), inline: true },
        { name: '🕐 Top 3 Peak Hours', value: topHoursText, inline: false },
        { name: '📈 Day Breakdown', value: `\`\`\`${dayBreakdown}\`\`\``, inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} • Enterprise Insights` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
