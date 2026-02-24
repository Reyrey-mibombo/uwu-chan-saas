const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forecast')
    .setDescription('View 7-day activity forecast based on recent trends'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: fourteenDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 Not enough data for a forecast. The bot needs at least some activity history.');
    }

    // Count per day for last 14 days
    const dailyCounts = {};
    activities.forEach(a => {
      const key = new Date(a.createdAt).toISOString().split('T')[0];
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avg = counts.reduce((s, v) => s + v, 0) / Math.max(counts.length, 1);
    const trend = counts.length >= 2
      ? (counts.slice(-3).reduce((s, v) => s + v, 0) / 3) - (counts.slice(0, 3).reduce((s, v) => s + v, 0) / 3)
      : 0;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const forecastLines = [];
    for (let i = 1; i <= 7; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      const predicted = Math.max(0, Math.round(avg + (trend * i / 7)));
      const level = predicted > avg * 1.2 ? 'High' : predicted < avg * 0.8 ? 'Low' : 'Normal';
      const emoji = level === 'High' ? '🔴' : level === 'Low' ? '🔵' : '🟡';
      forecastLines.push(`${dayNames[day.getDay()]} ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${emoji} **${predicted}** events (${level})`);
    }

    const embed = new EmbedBuilder()
      .setTitle('🔮 7-Day Activity Forecast')
      .setColor(0x9b59b6)
      .setDescription(forecastLines.join('\n'))
      .addFields(
        { name: '📊 14d Average/day', value: avg.toFixed(1), inline: true },
        { name: '📈 Trend', value: trend > 0.5 ? 'Growing ↑' : trend < -0.5 ? 'Declining ↓' : 'Stable →', inline: true },
        { name: '📅 Data Points', value: counts.length.toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Predictive Forecast` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
