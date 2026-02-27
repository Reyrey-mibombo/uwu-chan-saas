const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_alerts')
    .setDescription('View AI-powered activity drop alerts for your server'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const thisWeek = new Date(now - 7 * 86400000);
    const lastWeek = new Date(now - 14 * 86400000);

    const [recent, previous] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: thisWeek } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: lastWeek, $lt: thisWeek } }).lean()
    ]);

    const alerts = [];
    const check = (label, cur, prev, dropPct = 20) => {
      if (prev === 0) return;
      const pct = ((cur - prev) / prev) * 100;
      if (pct <= -dropPct) alerts.push(`🔴 **${label}** dropped ${Math.abs(pct).toFixed(1)}% (${prev} → ${cur})`);
    };

    check('Total Activity', recent.length, previous.length);
    check('Commands', recent.filter(a => a.type === 'command').length, previous.filter(a => a.type === 'command').length);
    check('Active Users',
      [...new Set(recent.map(a => a.userId))].length,
      [...new Set(previous.map(a => a.userId))].length);

    const alertText = alerts.length ? alerts.join('\n') : '✅ **All systems normal.** No significant drops detected.';
    const status = alerts.length ? `⚠️ ${alerts.length} Alert(s) Active` : '✅ Healthy';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🤖 Smart Alert System')
      
      .addFields(
        { name: '📊 Status', value: status, inline: true },
        { name: '⚡ This Week', value: recent.length.toString(), inline: true },
        { name: '📅 Last Week', value: previous.length.toString(), inline: true },
        { name: '🔔 Smart Alerts', value: alertText }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
