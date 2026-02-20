const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_chart')
    .setDescription('View a rolling prediction chart of server activity'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: fourteenDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 No data available for prediction chart.');
    }

    const dailyCounts = {};
    activities.forEach(a => {
      const key = new Date(a.createdAt).toISOString().split('T')[0];
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    });

    const entries = Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0]));
    const counts = entries.map(e => e[1]);
    const max = Math.max(...counts, 1);

    // 3-day rolling average
    const rolling = counts.map((_, i) => {
      const slice = counts.slice(Math.max(0, i - 2), i + 1);
      return slice.reduce((s, v) => s + v, 0) / slice.length;
    });

    const chartLines = entries.map(([date, count], i) => {
      const bar = '█'.repeat(Math.round((count / max) * 10));
      const rollBar = '▒'.repeat(Math.round((rolling[i] / max) * 10));
      const label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${label}: ${bar.padEnd(10)} ${count} (avg: ${rolling[i].toFixed(1)})`;
    }).join('\n');

    const trend = rolling[rolling.length - 1] > rolling[0] ? '📈 Upward' : rolling[rolling.length - 1] < rolling[0] ? '📉 Downward' : '➡️ Flat';

    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Prediction Chart — 14 Days')
      .setColor(0x16a085)
      .setDescription(`\`\`\`${chartLines}\`\`\``)
      .addFields(
        { name: '📈 Overall Trend', value: trend, inline: true },
        { name: '🔝 Peak Day', value: entries[counts.indexOf(max)]?.[0] || 'N/A', inline: true },
        { name: '📊 7d Rolling Avg', value: rolling.slice(-7).reduce((s, v) => s + v, 0) / 7 > 0 ? (rolling.slice(-7).reduce((s, v) => s + v, 0) / 7).toFixed(1) : '0', inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • █ = Actual | ▒ = Rolling Avg` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
