const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_forecast')
    .setDescription('View 30-day activity forecast based on 60-day trends'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: sixtyDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 Not enough data for a monthly forecast yet.');
    }

    const dailyCounts = {};
    activities.forEach(a => {
      const key = new Date(a.createdAt).toISOString().split('T')[0];
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avg = counts.reduce((s, v) => s + v, 0) / Math.max(counts.length, 1);
    const recentCounts = counts.slice(-14);
    const recentAvg = recentCounts.reduce((s, v) => s + v, 0) / Math.max(recentCounts.length, 1);
    const monthlyTrend = recentAvg > avg ? '📈 Growing' : recentAvg < avg ? '📉 Declining' : '➡️ Stable';

    const weeklyPredictions = [];
    for (let week = 1; week <= 4; week++) {
      const predicted = Math.max(0, Math.round(recentAvg * 7 * (1 + (recentAvg - avg) / Math.max(avg, 1) * 0.1 * week)));
      const change = avg > 0 ? (((predicted / 7 - avg) / avg) * 100).toFixed(1) : '0';
      weeklyPredictions.push(`**Week ${week}**: ~${predicted} events (${change}% vs baseline)`);
    }

    const monthlyTotal = Math.round(recentAvg * 30);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📅 30-Day Monthly Forecast')
      
      .addFields(
        { name: '📊 60-Day Baseline/day', value: avg.toFixed(1), inline: true },
        { name: '📈 Recent 14d Avg/day', value: recentAvg.toFixed(1), inline: true },
        { name: '📉 Trend', value: monthlyTrend, inline: true },
        { name: '🔢 Predicted Monthly Total', value: monthlyTotal.toString(), inline: true },
        { name: '📅 Data Points Used', value: counts.length.toString(), inline: true },
        { name: '📆 Weekly Breakdown', value: weeklyPredictions.join('\n') }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
