const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_trend')
    .setDescription('View analytics trends comparing this week vs last week'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: oneWeekAgo } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }).lean()
    ]);

    const change = lastWeek.length > 0
      ? (((thisWeek.length - lastWeek.length) / lastWeek.length) * 100).toFixed(1)
      : 'N/A';

    const trend = lastWeek.length === 0 ? '➡️' : thisWeek.length > lastWeek.length ? '📈' : thisWeek.length < lastWeek.length ? '📉' : '➡️';

    // Daily breakdown this week
    const dayLabels = [];
    const dayCounts = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now - i * 24 * 60 * 60 * 1000);
      const label = day.toLocaleDateString('en-US', { weekday: 'short' });
      dayLabels.push(label);
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      dayCounts.push(thisWeek.filter(a => new Date(a.createdAt) >= start && new Date(a.createdAt) <= end).length);
    }

    const maxCount = Math.max(...dayCounts, 1);
    const chart = dayLabels.map((d, i) => {
      const bar = '█'.repeat(Math.round((dayCounts[i] / maxCount) * 8)) + '░'.repeat(8 - Math.round((dayCounts[i] / maxCount) * 8));
      return `${d}: ${bar} ${dayCounts[i]}`;
    }).join('\n');

    const cmdThis = thisWeek.filter(a => a.type === 'command').length;
    const cmdLast = lastWeek.filter(a => a.type === 'command').length;

    const embed = new EmbedBuilder()
      .setTitle(`${trend} Analytics Trend`)
      .setColor(trend === '📈' ? 0x2ecc71 : trend === '📉' ? 0xe74c3c : 0x95a5a6)
      .addFields(
        { name: '📊 This Week', value: thisWeek.length.toString(), inline: true },
        { name: '📅 Last Week', value: lastWeek.length.toString(), inline: true },
        { name: '📈 Change', value: change === 'N/A' ? 'N/A' : `${change}%`, inline: true },
        { name: '⚡ Commands This Week', value: cmdThis.toString(), inline: true },
        { name: '⚡ Commands Last Week', value: cmdLast.toString(), inline: true },
        { name: '👥 Active Users (7d)', value: [...new Set(thisWeek.map(a => a.userId))].length.toString(), inline: true },
        { name: '📆 This Week Daily', value: `\`\`\`${chart}\`\`\`` }
      )
      .setFooter({ text: `${interaction.guild.name} • Week-over-Week Analysis` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
