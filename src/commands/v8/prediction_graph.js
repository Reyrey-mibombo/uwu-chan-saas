const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_graph')
    .setDescription('Visual prediction graph for the next 7 days'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const acts = await Activity.find({ guildId, createdAt: { $gte: fourteenDaysAgo } }).lean();

    if (!acts.length) return interaction.editReply('📊 Not enough data for predictions.');

    const daily = {};
    acts.forEach(a => { const k = new Date(a.createdAt).toISOString().split('T')[0]; daily[k] = (daily[k] || 0) + 1; });
    const counts = Object.values(daily);
    const avg = counts.reduce((s, v) => s + v, 0) / Math.max(counts.length, 1);
    const recent = counts.slice(-7);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / Math.max(recent.length, 1);
    const trendFactor = recentAvg / Math.max(avg, 1);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const maxPred = Math.max(recentAvg * trendFactor * 1.5, 1);
    const lines = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const pred = Math.round(recentAvg * trendFactor * ((d.getDay() === 0 || d.getDay() === 6) ? 0.7 : 1.1));
      const bar = '█'.repeat(Math.round(Math.min(pred, maxPred) / maxPred * 10)).padEnd(10, '░');
      lines.push(`${dayNames[d.getDay()]}: ${bar} ~${pred}`);
    }

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔮 Prediction Graph — Next 7 Days')
      
      .setDescription(`\`\`\`${lines.join('\n')}\`\`\``)
      .addFields(
        { name: '📊 14d Avg/Day', value: avg.toFixed(1), inline: true },
        { name: '📈 Recent Trend Factor', value: trendFactor.toFixed(2) + 'x', inline: true }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
